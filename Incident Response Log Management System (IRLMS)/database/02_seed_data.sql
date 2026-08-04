-- ============================================================
-- IRLMS - Seed Data
-- ============================================================
USE irlms_db;

-- ============================================================
-- Severity Levels
-- ============================================================
INSERT INTO SeverityLevels (SeverityName, ResponseSLAHours, ColorCode, Priority, Description) VALUES
('Critical', 1.0, '#FF0000', 1, 'Immediate threat to operations. Requires instant response.'),
('High', 4.0, '#FF6600', 2, 'Significant impact. Respond within 4 hours.'),
('Medium', 24.0, '#FFCC00', 3, 'Moderate impact. Respond within 24 hours.'),
('Low', 72.0, '#00CC00', 4, 'Minor issue. Respond within 72 hours.');

-- ============================================================
-- Incident Types
-- ============================================================
INSERT INTO IncidentTypes (TypeName, Description, Category) VALUES
('Ransomware Attack', 'Malware that encrypts data and demands ransom payment', 'Malware'),
('Spear Phishing', 'Targeted phishing campaign against specific individuals', 'Phishing'),
('Brute Force Attack', 'Repeated login attempts to gain unauthorized access', 'Unauthorized Access'),
('DDoS Attack', 'Distributed denial of service overwhelming network resources', 'DDoS'),
('Data Exfiltration', 'Unauthorized transfer of sensitive data outside the organization', 'Data Breach'),
('Insider Data Theft', 'Employee stealing proprietary information', 'Insider Threat'),
('Policy Violation', 'Employee violating security policies', 'Policy Violation'),
('Physical Breach', 'Unauthorized physical access to secure area', 'Physical'),
('Vishing Attack', 'Voice phishing via phone calls', 'Social Engineering'),
('Web Application Attack', 'SQLi, XSS, or other web app exploitation', 'Unauthorized Access');

-- ============================================================
-- Users (password is 'Password123!' hashed with bcrypt)
-- ============================================================
INSERT INTO Users (Username, Email, PasswordHash, Role, FullName, Phone, Department) VALUES
('admin', 'admin@irlms.com', '$2b$10$5UGV0eJKvtXQ52vOqNQdxed7Jj7UtSi0Qc8bKZdLFExxXTy8Vbbda', 'Admin', 'System Administrator', '+1-555-0100', 'IT Security'),
('manager1', 'manager@irlms.com', '$2b$10$5UGV0eJKvtXQ52vOqNQdxed7Jj7UtSi0Qc8bKZdLFExxXTy8Vbbda', 'Manager', 'Sara Ali', '+1-555-0101', 'Security Operations'),
('analyst1', 'analyst1@irlms.com', '$2b$10$5UGV0eJKvtXQ52vOqNQdxed7Jj7UtSi0Qc8bKZdLFExxXTy8Vbbda', 'Analyst', 'Ihtisham Akhtar', '+1-555-0102', 'SOC Tier 2'),
('analyst2', 'analyst2@irlms.com', '$2b$10$5UGV0eJKvtXQ52vOqNQdxed7Jj7UtSi0Qc8bKZdLFExxXTy8Vbbda', 'Analyst', 'Ayaan Khan', '+1-555-0103', 'SOC Tier 1'),
('auditor1', 'auditor@irlms.com', '$2b$10$5UGV0eJKvtXQ52vOqNQdxed7Jj7UtSi0Qc8bKZdLFExxXTy8Vbbda', 'Auditor', 'Hira Naveed', '+1-555-0104', 'Compliance');

-- ============================================================
-- Assets
-- ============================================================
INSERT INTO Assets (Hostname, IPAddress, MACAddress, OS, AssetType, Location, Criticality, OwnerID) VALUES
('DC-PROD-01', '10.0.1.10', '00:1A:2B:3C:4D:01', 'Windows Server 2022', 'Server', 'Data Center A', 'Critical', 1),
('DC-PROD-02', '10.0.1.11', '00:1A:2B:3C:4D:02', 'Ubuntu 22.04 LTS', 'Server', 'Data Center A', 'Critical', 1),
('MAIL-GW-01', '10.0.2.5', '00:1A:2B:3C:4D:03', 'FortiOS 7.4', 'Network', 'DMZ', 'High', 1),
('WS-FINANCE-01', '10.0.10.50', '00:1A:2B:3C:4D:10', 'Windows 11 Pro', 'Workstation', 'Finance Floor', 'High', 2),
('WS-DEVELOP-01', '10.0.10.51', '00:1A:2B:3C:4D:11', 'Ubuntu 22.04', 'Workstation', 'Dev Team', 'Medium', 3),
('CLOUD-AWS-PROD', '54.123.45.67', NULL, 'Amazon Linux 2023', 'Cloud', 'AWS us-east-1', 'Critical', 1),
('IOT-SENSOR-01', '10.0.50.1', '00:1A:2B:3C:4D:20', 'Embedded Linux', 'IoT', 'Warehouse', 'Low', 2);

-- ============================================================
-- Sample Incidents (for demo purposes)
-- ============================================================
INSERT INTO Incidents (IncidentRefNo, Title, Description, ReportedAt, ReporterID, TypeID, SeverityID, AssetID, AssignedToID, Status, ResolvedAt) VALUES
('IRLMS-2026-0001', 'Suspicious Login Attempts on DC-PROD-01', 'Multiple failed login attempts detected from external IP 203.0.113.45. Over 500 attempts in 15 minutes.', '2026-07-01 08:30:00', 3, 3, 2, 1, 3, 'Resolved', '2026-07-01 10:45:00'),
('IRLMS-2026-0002', 'Phishing Campaign Targeting Finance Department', 'Employees in Finance received emails claiming to be from CEO requesting urgent wire transfer.', '2026-07-02 14:00:00', 4, 2, 1, 4, 3, 'In Progress', NULL),
('IRLMS-2026-0003', 'DDoS Attack on Public Web Server', 'Web server experiencing 10 Gbps UDP flood attack. Customer-facing site intermittently unavailable.', '2026-07-03 09:15:00', 3, 4, 1, 6, 3, 'In Progress', NULL),
('IRLMS-2026-0004', 'Unusual Database Query Pattern', 'SELECT * queries on customer database outside normal business hours. Possible data exfiltration.', '2026-07-04 02:30:00', 4, 5, 1, 2, NULL, 'Open', NULL),
('IRLMS-2026-0005', 'USB Device Policy Violation', 'Employee connected unauthorized USB storage device to workstation. Potential malware vector.', '2026-07-04 16:45:00', 3, 7, 3, 5, 4, 'Open', NULL),
('IRLMS-2026-0006', 'Suspicious PowerShell Execution', 'Encoded PowerShell command executed on DC-PROD-02. Possible C2 beaconing.', '2026-07-05 11:00:00', 4, 1, 1, 2, 3, 'Open', NULL);

-- ============================================================
-- Sample Response Actions
-- ============================================================
INSERT INTO ResponseActions (IncidentID, ActionBy, ActionTime, ActionType, Details, DurationMinutes) VALUES
(1, 3, '2026-07-01 08:35:00', 'Investigation', 'Reviewed Windows Event Logs. Confirmed brute force pattern from IP 203.0.113.45. Source geolocation: Russia.', 15),
(1, 3, '2026-07-01 09:00:00', 'Containment', 'Added source IP to firewall blocklist. Implemented account lockout policy with 5-attempt threshold.', 20),
(1, 2, '2026-07-01 10:30:00', 'Recovery', 'Confirmed no successful logins. Reset affected service account passwords. Incident resolved.', 15),
(2, 4, '2026-07-02 14:05:00', 'Investigation', 'Quarantined 3 email accounts that received the phishing email. Analyzing email headers.', 30),
(2, 3, '2026-07-02 15:00:00', 'Containment', 'Sent organization-wide alert. Blocked sender domain at mail gateway. Initiated password reset for targeted users.', 25),
(3, 3, '2026-07-03 09:20:00', 'Containment', 'Activated DDoS mitigation via Cloudflare. Traffic scrubbing in progress.', 10);

-- ============================================================
-- Sample Assignments
-- ============================================================
INSERT INTO Assignments (IncidentID, AssignedToID, AssignedBy, AssignedAt, Notes) VALUES
(1, 3, 2, '2026-07-01 08:32:00', 'Urgent - Tier 2 escalation required'),
(2, 3, 2, '2026-07-02 14:02:00', 'High priority phishing investigation'),
(3, 3, 2, '2026-07-03 09:18:00', 'DDoS - coordinate with network team'),
(4, 3, 2, '2026-07-04 03:00:00', 'Pending assignment - awaiting senior analyst');

-- ============================================================
-- Sample Comments
-- ============================================================
INSERT INTO IncidentComments (IncidentID, UserID, CommentText, IsInternal) VALUES
(1, 3, 'Initial analysis suggests this is automated scanning, not targeted. Monitoring continues.', TRUE),
(2, 2, 'Notify executive team about this phishing campaign. Prepare briefing for 3 PM.', TRUE),
(3, 1, 'Cloudflare DDoS protection engaged. Expect full mitigation within 30 minutes.', FALSE),
(4, 4, 'Database audit logs show query originated from internal IP 10.0.10.50. Cross-referencing with Finance.', TRUE);

-- ============================================================
-- Sample Playbooks
-- ============================================================
INSERT INTO Playbooks (TypeID, Title, ProcedureText, ChecklistItems, Version, CreatedBy) VALUES
(1, 'Ransomware Response Playbook', 
 '1. Isolate affected systems immediately\n2. Identify ransomware variant\n3. Determine encryption scope\n4. Activate backup restoration\n5. Preserve forensic evidence\n6. Notify legal and compliance\n7. Engage incident response retainer',
 '["Isolate affected systems", "Identify variant via ransom note", "Check backup integrity", "Collect memory dump", "Report to CISO"]',
 '2.1', 1),
(4, 'DDoS Mitigation Playbook',
 '1. Confirm DDoS via traffic analysis\n2. Activate mitigation provider\n3. Implement rate limiting\n4. Blackhole attack sources\n5. Monitor for application-layer attacks\n6. Coordinate with ISP\n7. Post-incident traffic review',
 '["Confirm attack type", "Activate DDoS protection service", "Enable rate limiting on WAF", "Contact ISP NOC", "Document traffic patterns"]',
 '1.0', 1);

-- ============================================================
-- Playbook Checklist JSON (stored in Playbooks table)
-- ============================================================

SELECT 'Seed data loaded successfully' AS Status;