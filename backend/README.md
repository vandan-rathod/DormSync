# DormSync backend (Node.js + Express + MySQL 8)

This backend connects the existing HTML/CSS/JavaScript frontend to the DormSync MySQL schema. Complaints, leave requests and day-out requests are stored in MySQL rather than only in browser localStorage.

## Requirements
- Node.js 18 or newer
- MySQL 8.0
- The project files in this folder

## 1. Create and prepare the database
In MySQL Workbench, create a schema named `dormsync` (or use another name and set `DB_NAME` in `.env`).

Run these SQL files in this order:
1. `backend/sql/dormsync_schema.sql` — core schema tables.
2. `backend/sql/setup_demo.sql` — adds leave/day-out tables, complaint categories and a demo resident for local testing.

`dormsync_transactions.sql` contains optional transaction examples; it is not required to start the server.

The demo resident uses student number `DEMO-25BCP111`. For an existing resident, change `DEMO_STUDENT_NUMBER` in `.env` to that resident's `student_number`. Do not use demo credentials/data in production.

## 2. Configure the connection
Open a terminal in the `backend` folder and run:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to match your local MySQL setup. Never commit `.env` or share its password.

## 3. Install and start
From the `backend` folder:

```bash
npm install
npm start
```

Open **http://localhost:3000** in your browser. The server serves the frontend and API from one origin, so API calls work without configuring CORS manually.

Check database connectivity at **http://localhost:3000/api/health**. A healthy response looks like:

```json
{"status":"ok","database":"connected","service":"DormSync API"}
```

## Implemented API routes
- `GET /api/health` — database health check
- `GET /api/complaints` — list complaints for the configured resident
- `POST /api/complaints` — create a complaint
- `PATCH /api/complaints/:id/status` — update a resident's complaint status and write status history
- `GET /api/leaves` / `POST /api/leaves` — list/create leave requests
- `GET /api/dayouts` / `POST /api/dayouts` — list/create day-out requests
- `GET /api/profile` — resident and current room information

The frontend's complaint, leave and day-out workflows call these routes. Contacts and static noticeboard content remain frontend demo content.

## Troubleshooting
- `ECONNREFUSED`: start MySQL and confirm `DB_HOST`/`DB_PORT`.
- `Access denied for user`: correct `DB_USER` and `DB_PASSWORD`.
- `Unknown database 'dormsync'`: create the database before importing SQL.
- `Resident ... not found`: run `setup_demo.sql` or set `DEMO_STUDENT_NUMBER` to an active resident's student number.
- `Table ... doesn't exist`: import `dormsync_schema.sql`, then `setup_demo.sql`, in that order.
- `ER_BAD_FIELD_ERROR` / SQL syntax error: confirm the server is MySQL 8.0 and not SQLite.

## Notes
- SQL queries use placeholders and a connection pool.
- Inputs are validated on the API; errors return JSON.
- This is a college-project starter, not production-ready authentication. The demo identity is selected through `.env`; before real deployment, add login/session authentication and authorize residents based on the authenticated account.
