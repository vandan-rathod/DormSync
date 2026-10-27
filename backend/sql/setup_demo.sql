-- Run this AFTER importing config/DormSync_MySQL8_Schema.zip's
-- dormsync_schema.sql into a database named dormsync.
-- Creates the additional leave/day-out tables and a demo resident for local testing.
USE dormsync;

CREATE TABLE IF NOT EXISTS leave_requests (
  leave_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(100) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  comment VARCHAR(500) NULL,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_leave_dates CHECK (end_at > start_at),
  CONSTRAINT fk_leave_resident FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_leave_resident_status (resident_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS dayout_requests (
  dayout_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id BIGINT UNSIGNED NOT NULL,
  destination VARCHAR(150) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  purpose VARCHAR(255) NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dayout_dates CHECK (end_at > start_at),
  CONSTRAINT fk_dayout_resident FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_dayout_resident_status (resident_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO roles (role_name, description)
VALUES ('RESIDENT', 'Hostel resident'), ('WARDEN', 'Hostel warden'), ('ADMIN', 'System administrator')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO complaint_categories (category_name, description, is_active) VALUES
('Electricity','Electrical and AC issues',TRUE),
('Plumbing','Water and plumbing issues',TRUE),
('Carpenter','Furniture and carpentry issues',TRUE),
('Internet','Network connectivity issues',TRUE),
('Housekeeping','Cleaning and pest control',TRUE),
('Hot Water','Hot water and geyser issues',TRUE),
('Lift','Elevator issues',TRUE),
('Civil','Civil maintenance issues',TRUE),
('CURTAIN','Curtain and fittings issues',TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

INSERT INTO hostels (hostel_name, address, gender_policy, is_active)
VALUES ('DormSync Demo Hostel', 'PDEU Campus, Gandhinagar, Gujarat', 'MIXED', TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

INSERT INTO floors (hostel_id, floor_number, floor_name)
SELECT hostel_id, 1, 'First Floor' FROM hostels
WHERE hostel_name = 'DormSync Demo Hostel'
ON DUPLICATE KEY UPDATE floor_name = VALUES(floor_name);

INSERT INTO rooms (floor_id, room_number, room_type, capacity, monthly_rate, is_active)
SELECT f.floor_id, '102', 'TRIPLE', 3, 0.00, TRUE
FROM floors f JOIN hostels h ON h.hostel_id = f.hostel_id
WHERE h.hostel_name = 'DormSync Demo Hostel' AND f.floor_number = 1
ON DUPLICATE KEY UPDATE is_active = TRUE;

INSERT INTO residents
(student_number, first_name, last_name, email, gender, department, course, study_year, admission_date, resident_status)
VALUES
('DEMO-25BCP111', 'Demo', 'Resident', 'demo.resident@example.com', 'UNSPECIFIED',
 'Computer Engineering', 'B.Tech', 2, CURRENT_DATE, 'ACTIVE')
ON DUPLICATE KEY UPDATE resident_status = 'ACTIVE';

-- A room allocation is optional for API use; add it only if one doesn't already exist.
INSERT INTO room_allocations (resident_id, room_id, start_date, allocation_status)
SELECT r.resident_id, rm.room_id, CURRENT_DATE, 'ACTIVE'
FROM residents r
JOIN rooms rm ON rm.room_number = '102'
JOIN floors f ON f.floor_id = rm.floor_id
JOIN hostels h ON h.hostel_id = f.hostel_id AND h.hostel_name = 'DormSync Demo Hostel'
WHERE r.student_number = 'DEMO-25BCP111'
AND NOT EXISTS (
  SELECT 1 FROM room_allocations ra
  WHERE ra.resident_id = r.resident_id AND ra.allocation_status IN ('ACTIVE','RESERVED')
);
