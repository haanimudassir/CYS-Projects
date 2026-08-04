-- ============================================================
-- IRLMS - Triggers
-- ============================================================
USE irlms_db;

DELIMITER //

-- ============================================================
-- TRIGGER 1: Auto-generate Incident Reference Number
-- ============================================================
DROP TRIGGER IF EXISTS trg_incident_refno//
CREATE TRIGGER trg_incident_refno
BEFORE INSERT ON Incidents
FOR EACH ROW
BEGIN
    DECLARE next_seq INT;
    
    SELECT IFNULL(MAX(CAST(SUBSTRING(IncidentRefNo, 12) AS UNSIGNED)), 0) + 1
    INTO next_seq
    FROM Incidents
    WHERE YEAR(CreatedAt) = YEAR(NOW());
    
    SET NEW.IncidentRefNo = CONCAT('IRLMS-', YEAR(NOW()), '-', LPAD(next_seq, 4, '0'));
END//

-- ============================================================
-- TRIGGER 2: Auto-audit INSERT on Incidents
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_insert_incident//
CREATE TRIGGER trg_audit_insert_incident
AFTER INSERT ON Incidents
FOR EACH ROW
BEGIN
    INSERT INTO AuditLogs (TableName, RecordID, Operation, NewValues, ChangedBy)
    VALUES (
        'Incidents',
        NEW.IncidentID,
        'INSERT',
        JSON_OBJECT(
            'IncidentRefNo', NEW.IncidentRefNo,
            'Title', NEW.Title,
            'Status', NEW.Status,
            'SeverityID', NEW.SeverityID,
            'TypeID', NEW.TypeID
        ),
        NEW.ReporterID
    );
END//

-- ============================================================
-- TRIGGER 3: Auto-audit UPDATE on Incidents
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_update_incident//
CREATE TRIGGER trg_audit_update_incident
BEFORE UPDATE ON Incidents
FOR EACH ROW
BEGIN
    INSERT INTO AuditLogs (TableName, RecordID, Operation, OldValues, NewValues, ChangedBy)
    VALUES (
        'Incidents',
        OLD.IncidentID,
        'UPDATE',
        JSON_OBJECT(
            'Status', OLD.Status,
            'AssignedToID', OLD.AssignedToID,
            'SeverityID', OLD.SeverityID,
            'Title', OLD.Title
        ),
        JSON_OBJECT(
            'Status', NEW.Status,
            'AssignedToID', NEW.AssignedToID,
            'SeverityID', NEW.SeverityID,
            'Title', NEW.Title
        ),
        COALESCE(NEW.AssignedToID, NEW.ReporterID)
    );
END//

-- ============================================================
-- TRIGGER 4: Auto-set ResolvedAt timestamp
-- ============================================================
DROP TRIGGER IF EXISTS trg_incident_resolved//
CREATE TRIGGER trg_incident_resolved
BEFORE UPDATE ON Incidents
FOR EACH ROW
BEGIN
    IF NEW.Status IN ('Resolved', 'Closed') AND OLD.Status NOT IN ('Resolved', 'Closed') THEN
        SET NEW.ResolvedAt = NOW();
    END IF;
    
    IF NEW.Status IN ('Open', 'Reopened', 'In Progress') THEN
        SET NEW.ResolvedAt = NULL;
    END IF;
END//

-- ============================================================
-- TRIGGER 5: Prevent deletion of resolved incidents
-- ============================================================
DROP TRIGGER IF EXISTS trg_prevent_delete_resolved//
CREATE TRIGGER trg_prevent_delete_resolved
BEFORE DELETE ON Incidents
FOR EACH ROW
BEGIN
    IF OLD.Status IN ('Resolved', 'Closed') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete resolved/closed incidents. Use soft-delete (IsDeleted flag) instead.';
    END IF;
END//

-- ============================================================
-- TRIGGER 6: Auto-audit DELETE on Incidents (soft delete)
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_soft_delete//
CREATE TRIGGER trg_audit_soft_delete
BEFORE UPDATE ON Incidents
FOR EACH ROW
BEGIN
    IF NEW.IsDeleted = TRUE AND OLD.IsDeleted = FALSE THEN
        INSERT INTO AuditLogs (TableName, RecordID, Operation, OldValues, NewValues, ChangedBy)
        VALUES (
            'Incidents',
            OLD.IncidentID,
            'DELETE',
            JSON_OBJECT('IncidentRefNo', OLD.IncidentRefNo, 'Title', OLD.Title, 'Status', OLD.Status),
            JSON_OBJECT('IsDeleted', TRUE),
            COALESCE(NEW.AssignedToID, NEW.ReporterID)
        );
    END IF;
END//

-- ============================================================
-- TRIGGER 7: Auto-log response action duration
-- ============================================================
DROP TRIGGER IF EXISTS trg_action_duration//
CREATE TRIGGER trg_action_duration
BEFORE INSERT ON ResponseActions
FOR EACH ROW
BEGIN
    IF NEW.DurationMinutes IS NULL THEN
        SET NEW.DurationMinutes = 0;
    END IF;
END//

-- ============================================================
-- TRIGGER 8: Audit trail for Assets
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_asset_update//
CREATE TRIGGER trg_audit_asset_update
AFTER UPDATE ON Assets
FOR EACH ROW
BEGIN
    INSERT INTO AuditLogs (TableName, RecordID, Operation, OldValues, NewValues, ChangedBy)
    VALUES (
        'Assets',
        OLD.AssetID,
        'UPDATE',
        JSON_OBJECT('Hostname', OLD.Hostname, 'Criticality', OLD.Criticality, 'IPAddress', OLD.IPAddress),
        JSON_OBJECT('Hostname', NEW.Hostname, 'Criticality', NEW.Criticality, 'IPAddress', NEW.IPAddress),
        NEW.OwnerID
    );
END//

-- ============================================================
-- TRIGGER 9: Prevent duplicate active assignments
-- ============================================================
DROP TRIGGER IF EXISTS trg_check_duplicate_assignment//
CREATE TRIGGER trg_check_duplicate_assignment
BEFORE INSERT ON Assignments
FOR EACH ROW
BEGIN
    DECLARE existing INT;
    SELECT COUNT(*) INTO existing
    FROM Assignments
    WHERE IncidentID = NEW.IncidentID
      AND AssignedToID = NEW.AssignedToID
      AND UnassignedAt IS NULL;
    
    IF existing > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This user is already actively assigned to this incident.';
    END IF;
END//

DELIMITER ;

SELECT 'Triggers created successfully' AS Status;