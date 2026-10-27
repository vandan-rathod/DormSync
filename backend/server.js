require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
// Serve the existing multi-page frontend and the API from one origin.
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dormsync',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: true
});

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validString = (v, max, label, required = true) => {
  if (v == null && !required) return null;
  if (typeof v !== 'string' || (required && !v.trim()) || v.length > max) {
    const e = new Error(`${label} is required and must be at most ${max} characters.`);
    e.status = 400; throw e;
  }
  return v.trim();
};
const parseDate = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    const e = new Error(`${label} must be a valid date/time.`); e.status = 400; throw e;
  }
  return value.replace('T', ' ').slice(0, 19);
};
const mapComplaint = r => ({
  id: Number(r.complaint_id),
  category: r.category_name,
  subCategory: r.title,
  priority: r.priority[0] + r.priority.slice(1).toLowerCase(),
  scope: 'Residence',
  description: r.description,
  assignedStaff: r.staff_name || 'Not Assigned',
  status: ({ OPEN: 'Pending', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' })[r.status] || r.status,
  createdAt: r.created_at,
  shortDate: String(r.created_at).slice(0, 10),
  resolvedAt: r.resolved_at
});
const mapLeave = r => ({
  id: Number(r.leave_id), reason: r.reason, start: r.start_at, end: r.end_at,
  comment: r.comment || '', urgent: Boolean(r.is_urgent),
  status: ({ PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rej/Can', CANCELLED: 'Rej/Can', COMPLETED: 'Completed' })[r.status] || r.status
});
const mapDayout = r => ({
  id: Number(r.dayout_id), status: r.status === 'PENDING' ? 'Pending Gate Pass' : r.status[0] + r.status.slice(1).toLowerCase(),
  title: `Day Out — ${r.destination}`,
  time: `${r.start_at} → ${r.end_at}`
});

async function getResidentId() {
  const number = process.env.DEMO_STUDENT_NUMBER || 'DEMO-25BCP111';
  const [rows] = await pool.execute(
    'SELECT resident_id FROM residents WHERE student_number = ? AND resident_status = ? LIMIT 1',
    [number, 'ACTIVE']
  );
  if (!rows.length) {
    const e = new Error(`Resident ${number} not found. Run backend/sql/setup_demo.sql or set DEMO_STUDENT_NUMBER to an active resident.`); e.status = 503; throw e;
  }
  return Number(rows[0].resident_id);
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected', service: 'DormSync API' });
}));

app.get('/api/complaints', asyncRoute(async (req, res) => {
  const residentId = await getResidentId();
  const [rows] = await pool.execute(
    `SELECT c.complaint_id, c.title, c.description, c.priority, c.status, c.created_at, c.resolved_at,
            cc.category_name, CONCAT(s.first_name, ' ', s.last_name) AS staff_name
       FROM complaints c JOIN complaint_categories cc ON cc.category_id = c.category_id
       LEFT JOIN staff s ON s.staff_id = c.assigned_staff_id
      WHERE c.resident_id = ? ORDER BY c.created_at DESC LIMIT 200`, [residentId]);
  res.json(rows.map(mapComplaint));
}));

app.post('/api/complaints', asyncRoute(async (req, res) => {
  const category = validString(req.body.category, 80, 'category');
  const title = validString(req.body.subCategory || req.body.title, 150, 'issue/title');
  const description = validString(req.body.description, 2000, 'description');
  const priorityInput = String(req.body.priority || 'MEDIUM').toUpperCase();
  const priority = ['LOW','MEDIUM','HIGH','URGENT'].includes(priorityInput) ? priorityInput : 'MEDIUM';
  const residentId = await getResidentId();
  const [cats] = await pool.execute('SELECT category_id FROM complaint_categories WHERE category_name = ? AND is_active = 1', [category]);
  if (!cats.length) { const e = new Error('Unknown complaint category. Import the setup SQL first.'); e.status = 400; throw e; }
  const [rooms] = await pool.execute(
    `SELECT room_id FROM room_allocations WHERE resident_id = ? AND allocation_status = 'ACTIVE' ORDER BY start_date DESC LIMIT 1`, [residentId]);
  const [result] = await pool.execute(
    `INSERT INTO complaints (resident_id, room_id, category_id, title, description, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`,
    [residentId, rooms[0]?.room_id || null, cats[0].category_id, title, description, priority]);
  const [rows] = await pool.execute(
    `SELECT c.complaint_id, c.title, c.description, c.priority, c.status, c.created_at, c.resolved_at,
            cc.category_name, NULL AS staff_name FROM complaints c
      JOIN complaint_categories cc ON cc.category_id = c.category_id WHERE c.complaint_id = ?`, [result.insertId]);
  res.status(201).json(mapComplaint(rows[0]));
}));

app.patch('/api/complaints/:id/status', asyncRoute(async (req, res) => {
  const residentId = await getResidentId();
  const statusMap = { Pending: 'OPEN', Assigned: 'ASSIGNED', 'In Progress': 'IN_PROGRESS', Resolved: 'RESOLVED', Closed: 'CLOSED' };
  const status = statusMap[req.body.status] || String(req.body.status || '').toUpperCase();
  if (!['OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED'].includes(status)) {
    const e = new Error('Invalid complaint status.'); e.status = 400; throw e;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.execute('SELECT status FROM complaints WHERE complaint_id = ? AND resident_id = ? FOR UPDATE', [req.params.id, residentId]);
    if (!existing.length) { const e = new Error('Complaint not found.'); e.status = 404; throw e; }
    await conn.execute('UPDATE complaints SET status = ?, resolved_at = ? WHERE complaint_id = ?',
      [status, status === 'RESOLVED' ? new Date() : null, req.params.id]);
    await conn.execute(
      'INSERT INTO complaint_status_history (complaint_id, old_status, new_status, change_note) VALUES (?, ?, ?, ?)',
      [req.params.id, existing[0].status, status, req.body.note || null]);
    await conn.commit();
    res.json({ id: Number(req.params.id), status: statusMap[req.body.status] ? req.body.status : status });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

app.get('/api/leaves', asyncRoute(async (_req, res) => {
  const residentId = await getResidentId();
  const [rows] = await pool.execute('SELECT * FROM leave_requests WHERE resident_id = ? ORDER BY created_at DESC LIMIT 200', [residentId]);
  res.json(rows.map(mapLeave));
}));
app.post('/api/leaves', asyncRoute(async (req, res) => {
  const residentId = await getResidentId();
  const reason = validString(req.body.reason, 100, 'reason');
  const start = parseDate(req.body.start, 'start');
  const end = parseDate(req.body.end, 'end');
  if (Date.parse(end) <= Date.parse(start)) { const e = new Error('Leave end must be after leave start.'); e.status = 400; throw e; }
  const comment = validString(req.body.comment || '', 500, 'comment', false);
  const urgent = Boolean(req.body.urgent);
  const [result] = await pool.execute(
    'INSERT INTO leave_requests (resident_id, reason, start_at, end_at, comment, is_urgent) VALUES (?, ?, ?, ?, ?, ?)',
    [residentId, reason, start, end, comment || null, urgent]);
  const [rows] = await pool.execute('SELECT * FROM leave_requests WHERE leave_id = ?', [result.insertId]);
  res.status(201).json(mapLeave(rows[0]));
}));

app.get('/api/dayouts', asyncRoute(async (_req, res) => {
  const residentId = await getResidentId();
  const [rows] = await pool.execute('SELECT * FROM dayout_requests WHERE resident_id = ? ORDER BY created_at DESC LIMIT 200', [residentId]);
  res.json(rows.map(mapDayout));
}));
app.post('/api/dayouts', asyncRoute(async (req, res) => {
  const residentId = await getResidentId();
  const destination = validString(req.body.destination || 'Gandhinagar City Visit', 150, 'destination');
  const start = parseDate(req.body.start || new Date(Date.now() + 60 * 60 * 1000).toISOString(), 'start');
  const end = parseDate(req.body.end || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), 'end');
  if (Date.parse(end) <= Date.parse(start)) { const e = new Error('Day-out end must be after start.'); e.status = 400; throw e; }
  const purpose = validString(req.body.purpose || '', 255, 'purpose', false);
  const [result] = await pool.execute(
    'INSERT INTO dayout_requests (resident_id, destination, start_at, end_at, purpose) VALUES (?, ?, ?, ?, ?)',
    [residentId, destination, start, end, purpose || null]);
  const [rows] = await pool.execute('SELECT * FROM dayout_requests WHERE dayout_id = ?', [result.insertId]);
  res.status(201).json(mapDayout(rows[0]));
}));

app.get('/api/profile', asyncRoute(async (_req, res) => {
  const residentId = await getResidentId();
  const [rows] = await pool.execute(
    `SELECT r.resident_id, r.student_number, r.first_name, r.last_name, r.email, r.phone, r.department,
            r.course, r.study_year, r.guardian_name, r.guardian_phone, r.resident_status,
            rm.room_number, h.hostel_name, f.floor_number
       FROM residents r
       LEFT JOIN room_allocations ra ON ra.resident_id = r.resident_id AND ra.allocation_status = 'ACTIVE'
       LEFT JOIN rooms rm ON rm.room_id = ra.room_id
       LEFT JOIN floors f ON f.floor_id = rm.floor_id
       LEFT JOIN hostels h ON h.hostel_id = f.hostel_id
      WHERE r.resident_id = ? LIMIT 1`, [residentId]);
  res.json(rows[0] || {});
}));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ECONNREFUSED' ? 503 : 500);
  res.status(status).json({ error: status === 500 ? 'Internal server error.' : err.message });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`DormSync API listening at http://localhost:${port}`));
