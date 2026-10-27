-- DormSync transactional routines and audit triggers for MySQL 8.0.16+
-- Install after dormsync_schema.sql.
-- Use this routine for all ACTIVE/RESERVED room allocations. Restrict direct INSERT/UPDATE
-- privileges on room_allocations for the application DB user so callers cannot bypass it.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_room_allocation$$
CREATE PROCEDURE sp_create_room_allocation(
    IN p_resident_id BIGINT UNSIGNED,
    IN p_room_id BIGINT UNSIGNED,
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_allocation_status VARCHAR(20),
    IN p_allocated_by BIGINT UNSIGNED,
    OUT p_allocation_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_capacity INT UNSIGNED DEFAULT NULL;
    DECLARE v_resident_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_not_found BOOLEAN DEFAULT FALSE;
    DECLARE v_overlap_count INT DEFAULT 0;
    DECLARE v_max_occupancy INT DEFAULT 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET p_allocation_id = NULL;

    IF p_start_date IS NULL OR (p_end_date IS NOT NULL AND p_end_date < p_start_date) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid allocation date range';
    END IF;

    IF p_allocation_status NOT IN ('ACTIVE', 'RESERVED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'New allocation status must be ACTIVE or RESERVED';
    END IF;

    START TRANSACTION;

    -- Lock the room row so concurrent allocations for this room serialize.
    SET v_not_found = FALSE;
    SELECT capacity INTO v_capacity
      FROM rooms
     WHERE room_id = p_room_id AND is_active = TRUE
     FOR UPDATE;
    IF v_not_found OR v_capacity IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room does not exist or is inactive';
    END IF;

    -- Lock resident row so simultaneous allocations to different rooms serialize for this resident.
    SET v_not_found = FALSE;
    SELECT resident_status INTO v_resident_status
      FROM residents
     WHERE resident_id = p_resident_id
     FOR UPDATE;
    IF v_not_found OR v_resident_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resident does not exist';
    END IF;
    IF v_resident_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only active residents can be allocated a room';
    END IF;

    -- Reject any overlapping non-cancelled allocation for this resident.
    SELECT COUNT(*) INTO v_overlap_count
      FROM room_allocations ra
     WHERE ra.resident_id = p_resident_id
       AND ra.allocation_status <> 'CANCELLED'
       AND ra.start_date <= COALESCE(p_end_date, '9999-12-31')
       AND COALESCE(ra.end_date, '9999-12-31') >= p_start_date;
    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resident already has an overlapping allocation';
    END IF;

    -- Check peak concurrent occupancy over the requested date range.
    -- Occupancy can only increase at the requested start date or at an existing allocation's start date.
    SELECT COALESCE(MAX(occupancy), 0) INTO v_max_occupancy
      FROM (
            SELECT candidate_dates.candidate_date,
                   (SELECT COUNT(*)
                      FROM room_allocations ra
                     WHERE ra.room_id = p_room_id
                       AND ra.allocation_status IN ('ACTIVE', 'RESERVED')
                       AND ra.start_date <= candidate_dates.candidate_date
                       AND (ra.end_date IS NULL OR ra.end_date >= candidate_dates.candidate_date)
                   ) AS occupancy
              FROM (
                    SELECT p_start_date AS candidate_date
                    UNION
                    SELECT ra.start_date
                      FROM room_allocations ra
                     WHERE ra.room_id = p_room_id
                       AND ra.allocation_status IN ('ACTIVE', 'RESERVED')
                       AND ra.start_date >= p_start_date
                       AND ra.start_date <= COALESCE(p_end_date, '9999-12-31')
                   ) AS candidate_dates
           ) AS occupancy_points;

    IF v_max_occupancy + 1 > v_capacity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room capacity would be exceeded';
    END IF;

    INSERT INTO room_allocations
        (resident_id, room_id, start_date, end_date, allocation_status, allocated_by)
    VALUES
        (p_resident_id, p_room_id, p_start_date, p_end_date, p_allocation_status, p_allocated_by);

    SET p_allocation_id = LAST_INSERT_ID();
    COMMIT;
END$$

DROP TRIGGER IF EXISTS trg_complaints_status_history_insert$$
CREATE TRIGGER trg_complaints_status_history_insert
AFTER INSERT ON complaints
FOR EACH ROW
BEGIN
    INSERT INTO complaint_status_history
        (complaint_id, old_status, new_status, changed_by, change_note)
    VALUES
        (NEW.complaint_id, NULL, NEW.status, @dormsync_user_id, 'Complaint created');
END$$

DROP TRIGGER IF EXISTS trg_complaints_status_history_update$$
CREATE TRIGGER trg_complaints_status_history_update
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF NOT (NEW.status <=> OLD.status) THEN
        INSERT INTO complaint_status_history
            (complaint_id, old_status, new_status, changed_by, change_note)
        VALUES
            (NEW.complaint_id, OLD.status, NEW.status, @dormsync_user_id, NULL);
    END IF;
END$$

DELIMITER ;

-- Example call (run as a user with EXECUTE permission):
-- SET @new_allocation_id = NULL;
-- SET @dormsync_user_id = 1; -- set per authenticated application request; NULL is permitted
-- CALL sp_create_room_allocation(101, 12, '2026-11-01', NULL, 'ACTIVE', 1, @new_allocation_id);
-- SELECT @new_allocation_id;
