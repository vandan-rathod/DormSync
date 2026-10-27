-- DormSync MySQL 8 reference DDL
-- Review transaction-enforced invariants described in README.md before deployment.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS `hostels` (
  `hostel_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `hostel_name` VARCHAR(100) NOT NULL UNIQUE,
  `address` VARCHAR(255) NOT NULL,
  `gender_policy` ENUM('MALE','FEMALE','MIXED') NOT NULL DEFAULT 'MIXED',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_hostels_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `floors` (
  `floor_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `hostel_id` BIGINT UNSIGNED NOT NULL,
  `floor_number` INT NOT NULL,
  `floor_name` VARCHAR(50) NULL,
  CONSTRAINT `uq_floors_hostel_number` UNIQUE (`hostel_id`, `floor_number`),
  CONSTRAINT `fk_floors_hostel_id` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`hostel_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY `idx_floors_hostel` (`hostel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `rooms` (
  `room_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `floor_id` BIGINT UNSIGNED NOT NULL,
  `room_number` VARCHAR(20) NOT NULL,
  `room_type` ENUM('SINGLE','DOUBLE','TRIPLE','QUAD','OTHER') NOT NULL DEFAULT 'OTHER',
  `capacity` SMALLINT UNSIGNED NOT NULL CHECK (capacity > 0),
  `monthly_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (monthly_rate >= 0),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT `uq_rooms_floor_number` UNIQUE (`floor_id`, `room_number`),
  CONSTRAINT `fk_rooms_floor_id` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`floor_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY `idx_rooms_floor_active` (`floor_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `residents` (
  `resident_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `student_number` VARCHAR(30) NOT NULL UNIQUE,
  `first_name` VARCHAR(60) NOT NULL,
  `last_name` VARCHAR(60) NOT NULL,
  `email` VARCHAR(254) NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `date_of_birth` DATE NULL,
  `gender` ENUM('MALE','FEMALE','OTHER','UNSPECIFIED') NOT NULL DEFAULT 'UNSPECIFIED',
  `department` VARCHAR(100) NULL,
  `course` VARCHAR(100) NULL,
  `study_year` TINYINT UNSIGNED NULL CHECK (study_year BETWEEN 1 AND 12),
  `guardian_name` VARCHAR(120) NULL,
  `guardian_phone` VARCHAR(20) NULL,
  `admission_date` DATE NOT NULL,
  `resident_status` ENUM('ACTIVE','INACTIVE','GRADUATED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_residents_status` (`resident_status`),
  KEY `idx_residents_name` (`last_name`, `first_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `staff` (
  `staff_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `employee_number` VARCHAR(30) NOT NULL UNIQUE,
  `first_name` VARCHAR(60) NOT NULL,
  `last_name` VARCHAR(60) NOT NULL,
  `email` VARCHAR(254) NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `job_title` VARCHAR(80) NOT NULL,
  `employment_status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `hire_date` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_staff_status_title` (`employment_status`, `job_title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `role_name` VARCHAR(40) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `username` VARCHAR(80) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `resident_id` BIGINT UNSIGNED NULL UNIQUE,
  `staff_id` BIGINT UNSIGNED NULL UNIQUE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `chk_users_single_profile` CHECK (resident_id IS NULL OR staff_id IS NULL),
  CONSTRAINT `fk_users_resident_id` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`resident_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_staff_id` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_user_roles_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hostel_staff_assignments` (
  `hostel_id` BIGINT UNSIGNED NOT NULL,
  `staff_id` BIGINT UNSIGNED NOT NULL,
  `assignment_role` VARCHAR(60) NOT NULL,
  `assigned_from` DATE NOT NULL,
  `assigned_until` DATE NULL,
  PRIMARY KEY (`hostel_id`, `staff_id`),
  CONSTRAINT `chk_staff_assignment_dates` CHECK (assigned_until IS NULL OR assigned_until >= assigned_from),
  CONSTRAINT `fk_hostel_staff_assignments_hostel_id` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`hostel_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hostel_staff_assignments_staff_id` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY `idx_hostel_staff_staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `room_allocations` (
  `allocation_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `resident_id` BIGINT UNSIGNED NOT NULL,
  `room_id` BIGINT UNSIGNED NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `allocation_status` ENUM('RESERVED','ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'RESERVED',
  `allocated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `chk_room_allocations_dates` CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT `fk_room_allocations_resident_id` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`resident_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_room_allocations_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_room_allocations_allocated_by` FOREIGN KEY (`allocated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_allocations_resident_status` (`resident_id`, `allocation_status`),
  KEY `idx_allocations_room_status` (`room_id`, `allocation_status`),
  KEY `idx_allocations_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `fee_types` (
  `fee_type_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `fee_name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `is_recurring` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `fee_invoices` (
  `invoice_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `invoice_number` VARCHAR(40) NOT NULL UNIQUE,
  `resident_id` BIGINT UNSIGNED NOT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `invoice_status` ENUM('DRAFT','ISSUED','VOID') NOT NULL DEFAULT 'DRAFT',
  `notes` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `chk_invoice_dates` CHECK (due_date >= issue_date),
  CONSTRAINT `fk_fee_invoices_resident_id` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`resident_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY `idx_invoices_resident_status_due` (`resident_id`, `invoice_status`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `invoice_item_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `invoice_id` BIGINT UNSIGNED NOT NULL,
  `fee_type_id` BIGINT UNSIGNED NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
  `unit_amount` DECIMAL(10,2) NOT NULL CHECK (unit_amount >= 0),
  CONSTRAINT `fk_invoice_items_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `fee_invoices` (`invoice_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_items_fee_type_id` FOREIGN KEY (`fee_type_id`) REFERENCES `fee_types` (`fee_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  KEY `idx_invoice_items_fee_type` (`fee_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `resident_id` BIGINT UNSIGNED NOT NULL,
  `transaction_reference` VARCHAR(100) NULL UNIQUE,
  `payment_date` DATETIME NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  `payment_method` ENUM('CASH','UPI','CARD','BANK_TRANSFER','OTHER') NOT NULL DEFAULT 'OTHER',
  `payment_status` ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `recorded_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_resident_id` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`resident_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_payments_resident_date` (`resident_id`, `payment_date`),
  KEY `idx_payments_status_date` (`payment_status`, `payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payment_allocations` (
  `payment_id` BIGINT UNSIGNED NOT NULL,
  `invoice_id` BIGINT UNSIGNED NOT NULL,
  `allocated_amount` DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
  PRIMARY KEY (`payment_id`, `invoice_id`),
  CONSTRAINT `fk_payment_allocations_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_allocations_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `fee_invoices` (`invoice_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY `idx_payment_allocations_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `complaint_categories` (
  `category_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `category_name` VARCHAR(80) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `complaints` (
  `complaint_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `resident_id` BIGINT UNSIGNED NOT NULL,
  `room_id` BIGINT UNSIGNED NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `assigned_staff_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED') NOT NULL DEFAULT 'OPEN',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME NULL,
  CONSTRAINT `fk_complaints_resident_id` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`resident_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_category_id` FOREIGN KEY (`category_id`) REFERENCES `complaint_categories` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_assigned_staff_id` FOREIGN KEY (`assigned_staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_complaints_status_priority_created` (`status`, `priority`, `created_at`),
  KEY `idx_complaints_staff_status` (`assigned_staff_id`, `status`),
  KEY `idx_complaints_resident` (`resident_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `complaint_status_history` (
  `history_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `old_status` VARCHAR(20) NULL,
  `new_status` VARCHAR(20) NOT NULL,
  `changed_by` BIGINT UNSIGNED NULL,
  `change_note` VARCHAR(500) NULL,
  `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_complaint_status_history_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_complaint_status_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_complaint_history_complaint_date` (`complaint_id`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
