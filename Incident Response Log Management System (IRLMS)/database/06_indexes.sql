-- ============================================================
-- IRLMS - Performance Indexes (Optimization)
-- ============================================================
USE irlms_db;

-- ============================================================
-- Additional Performance Indexes
-- ============================================================

-- Composite index for incident listing queries
CREATE INDEX idx_incidents_status_severity 
ON Incidents(Status, SeverityID);

-- Composite index for dashboard date-range queries
CREATE INDEX idx_incidents_reported_status 
ON Incidents(ReportedAt, Status);

-- Full-text index for search
ALTER TABLE Incidents 
ADD FULLTEXT INDEX idx_incidents_search (Title, Description);

ALTER TABLE Assets 
ADD FULLTEXT INDEX idx_assets_search (Hostname, IPAddress, Location);

-- Composite index for response actions
CREATE INDEX idx_actions_incident_time 
ON ResponseActions(IncidentID, ActionTime);

-- Index for assignment lookup
CREATE INDEX idx_assignments_active 
ON Assignments(IncidentID, UnassignedAt);

-- Index for audit queries by table and time range
CREATE INDEX idx_audit_operation_time 
ON AuditLogs(Operation, ChangedAt);

-- Index for SLA breach queries
CREATE INDEX idx_sla_resolved_breached 
ON SLABreachNotifications(Resolved, BreachedAt);

-- Index for user login tracking
CREATE INDEX idx_users_lastlogin 
ON Users(LastLogin);

-- Analyze tables for query optimizer
ANALYZE TABLE Users;
ANALYZE TABLE Assets;
ANALYZE TABLE Incidents;
ANALYZE TABLE ResponseActions;
ANALYZE TABLE Assignments;
ANALYZE TABLE AuditLogs;
ANALYZE TABLE IncidentEvidence;
ANALYZE TABLE IncidentComments;
ANALYZE TABLE Playbooks;
ANALYZE TABLE SLABreachNotifications;

SELECT 'Performance indexes created and tables analyzed' AS Status;