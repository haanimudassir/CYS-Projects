-- ============================================================
-- IRLMS - Views for Reporting
-- ============================================================
USE irlms_db;

-- ============================================================
-- VIEW 1: Open Incidents Overview
-- ============================================================
CREATE OR REPLACE VIEW vw_OpenIncidents AS
SELECT 
    i.IncidentID,
    i.IncidentRefNo,
    i.Title,
    i.Description,
    i.ReportedAt,
    TIMESTAMPDIFF(HOUR, i.ReportedAt, NOW()) AS HoursElapsed,
    r.FullName AS ReporterName,
    a.FullName AS AssigneeName,
    t.TypeName,
    t.Category,
    s.SeverityName,
    s.ColorCode,
    s.ResponseSLAHours,
    CASE 
        WHEN TIMESTAMPDIFF(HOUR, i.ReportedAt, NOW()) > s.ResponseSLAHours 
        THEN 'BREACHED' 
        ELSE 'Within SLA' 
    END AS SLAStatus,
    ast.Hostname,
    ast.IPAddress
FROM Incidents i
JOIN Users r ON i.ReporterID = r.UserID
LEFT JOIN Users a ON i.AssignedToID = a.UserID
JOIN IncidentTypes t ON i.TypeID = t.TypeID
JOIN SeverityLevels s ON i.SeverityID = s.SeverityID
LEFT JOIN Assets ast ON i.AssetID = ast.AssetID
WHERE i.Status IN ('Open', 'In Progress', 'Reopened') 
  AND i.IsDeleted = FALSE
ORDER BY s.Priority ASC, i.ReportedAt ASC;

-- ============================================================
-- VIEW 2: Incident Summary by Day
-- ============================================================
CREATE OR REPLACE VIEW vw_DailyIncidentSummary AS
SELECT 
    DATE(ReportedAt) AS IncidentDate,
    COUNT(*) AS TotalIncidents,
    SUM(CASE WHEN SeverityID = 1 THEN 1 ELSE 0 END) AS CriticalCount,
    SUM(CASE WHEN SeverityID = 2 THEN 1 ELSE 0 END) AS HighCount,
    SUM(CASE WHEN SeverityID = 3 THEN 1 ELSE 0 END) AS MediumCount,
    SUM(CASE WHEN SeverityID = 4 THEN 1 ELSE 0 END) AS LowCount,
    SUM(CASE WHEN Status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS ResolvedCount
FROM Incidents
WHERE IsDeleted = FALSE
GROUP BY DATE(ReportedAt)
ORDER BY IncidentDate DESC;

-- ============================================================
-- VIEW 3: Analyst Performance
-- ============================================================
CREATE OR REPLACE VIEW vw_AnalystPerformance AS
SELECT 
    u.UserID,
    u.FullName,
    COUNT(DISTINCT a.AssignmentID) AS TotalAssignments,
    COUNT(DISTINCT CASE WHEN ra.ActionID IS NOT NULL THEN ra.IncidentID END) AS IncidentsWorked,
    COUNT(DISTINCT CASE WHEN i.Status IN ('Resolved', 'Closed') THEN i.IncidentID END) AS ResolvedCount,
    ROUND(AVG(CASE WHEN i.ResolvedAt IS NOT NULL 
        THEN TIMESTAMPDIFF(HOUR, a.AssignedAt, i.ResolvedAt) END), 1) AS AvgResolutionHours,
    COUNT(DISTINCT CASE WHEN n.NotificationID IS NOT NULL THEN n.IncidentID END) AS SLAViolations
FROM Users u
LEFT JOIN Assignments a ON u.UserID = a.AssignedToID
LEFT JOIN Incidents i ON a.IncidentID = i.IncidentID AND i.IsDeleted = FALSE
LEFT JOIN ResponseActions ra ON i.IncidentID = ra.IncidentID AND ra.ActionBy = u.UserID
LEFT JOIN SLABreachNotifications n ON i.IncidentID = n.IncidentID AND n.Resolved = FALSE
WHERE u.Role = 'Analyst' AND u.IsActive = TRUE
GROUP BY u.UserID, u.FullName
ORDER BY ResolvedCount DESC;

-- ============================================================
-- VIEW 4: Asset Risk Assessment
-- ============================================================
CREATE OR REPLACE VIEW vw_AssetRiskAssessment AS
SELECT 
    a.AssetID,
    a.Hostname,
    a.IPAddress,
    a.OS,
    a.AssetType,
    a.Criticality,
    COUNT(i.IncidentID) AS TotalIncidents,
    SUM(CASE WHEN i.SeverityID <= 2 THEN 1 ELSE 0 END) AS HighSeverityIncidents,
    MAX(i.ReportedAt) AS LastIncidentDate,
    CASE 
        WHEN COUNT(i.IncidentID) = 0 THEN 'No Incidents'
        WHEN MAX(i.ReportedAt) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'Active Threat'
        ELSE 'Historical'
    END AS RiskStatus
FROM Assets a
LEFT JOIN Incidents i ON a.AssetID = i.AssetID AND i.IsDeleted = FALSE
GROUP BY a.AssetID, a.Hostname, a.IPAddress, a.OS, a.AssetType, a.Criticality
ORDER BY a.Criticality ASC, TotalIncidents DESC;

SELECT 'All views created successfully' AS Status;