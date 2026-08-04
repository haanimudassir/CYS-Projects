-- ============================================================
-- IRLMS - Scheduled Events
-- ============================================================
USE irlms_db;

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

DELIMITER //

-- ============================================================
-- EVENT 1: Hourly SLA Breach Check
-- ============================================================
DROP EVENT IF EXISTS evt_hourly_sla_check//
CREATE EVENT evt_hourly_sla_check
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    INSERT INTO SLABreachNotifications (IncidentID, SLAHours, ElapsedHours, NotifiedTo)
    SELECT i.IncidentID, s.ResponseSLAHours,
           ROUND(TIMESTAMPDIFF(HOUR, i.ReportedAt, NOW()), 1),
           i.AssignedToID
    FROM Incidents i
    JOIN SeverityLevels s ON i.SeverityID = s.SeverityID
    WHERE i.Status IN ('Open', 'In Progress')
      AND TIMESTAMPDIFF(HOUR, i.ReportedAt, NOW()) > s.ResponseSLAHours
      AND i.IsDeleted = FALSE
      AND NOT EXISTS (
          SELECT 1 FROM SLABreachNotifications n 
          WHERE n.IncidentID = i.IncidentID AND n.Resolved = FALSE
      );
END//

-- ============================================================
-- EVENT 2: Nightly Summary Rollup (Materialized View)
-- ============================================================
DROP EVENT IF EXISTS evt_nightly_summary//
CREATE EVENT evt_nightly_summary
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '00:00:00')
DO
BEGIN
    -- Create a temp table for the daily summary
    DROP TABLE IF EXISTS mv_IncidentSummary;
    
    CREATE TABLE mv_IncidentSummary AS
    SELECT 
        CURDATE() AS SummaryDate,
        COUNT(*) AS TotalIncidents,
        SUM(CASE WHEN Status IN ('Open', 'In Progress', 'Reopened') THEN 1 ELSE 0 END) AS TotalOpen,
        SUM(CASE WHEN Status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS TotalResolved,
        (SELECT COUNT(*) FROM SLABreachNotifications WHERE Resolved = FALSE) AS ActiveSLAViolations,
        ROUND(AVG(CASE WHEN ResolvedAt IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, ReportedAt, ResolvedAt) END), 1) AS AvgResolutionHours,
        (SELECT JSON_OBJECTAGG(t.TypeName, cnt)
         FROM (
             SELECT TypeID, COUNT(*) AS cnt 
             FROM Incidents 
             WHERE CreatedAt >= CURDATE() - INTERVAL 30 DAY AND IsDeleted = FALSE
             GROUP BY TypeID
         ) ic
         JOIN IncidentTypes t ON ic.TypeID = t.TypeID) AS IncidentsByTypeJSON
    FROM Incidents
    WHERE IsDeleted = FALSE;
    
    -- Archive old SLA notifications (mark as historical)
    UPDATE SLABreachNotifications
    SET Resolved = TRUE, ResolvedAt = NOW()
    WHERE Resolved = FALSE
      AND IncidentID IN (
          SELECT IncidentID FROM Incidents 
          WHERE Status IN ('Resolved', 'Closed')
      );
END//

DELIMITER ;

SELECT 'Scheduled events created successfully' AS Status;