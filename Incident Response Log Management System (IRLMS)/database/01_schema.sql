-- ============================================================
-- IRLMS - Incident Response Log Management System
-- Schema Definition - BCNF Normalized
-- ============================================================

CREATE DATABASE IF NOT EXISTS irlms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE irlms_db;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('Analyst', 'Manager', 'Admin', 'Auditor') NOT NULL DEFAULT 'Analyst',
    FullName VARCHAR(100) NOT NULL,
    Phone VARCHAR(20),
    Department VARCHAR(100),
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastLogin TIMESTAMP NULL,
    UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_role (Role),
    INDEX idx_users_active (IsActive)
) ENGINE=InnoDB;

-- ============================================================
-- 2. ASSETS TABLE
-- ============================================================
CREATE TABLE Assets (
    AssetID INT AUTO_INCREMENT PRIMARY KEY,
    Hostname VARCHAR(100) NOT NULL,
    IPAddress VARCHAR(45),
    MACAddress VARCHAR(17),
    OS VARCHAR(100),
    AssetType ENUM('Server', 'Workstation', 'Network', 'Cloud', 'IoT', 'Mobile', 'Other') NOT NULL DEFAULT 'Other',
    Location VARCHAR(100),
    Criticality ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    OwnerID INT,
    Notes TEXT,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_assets_hostname (Hostname),
    INDEX idx_assets_type (AssetType),
    INDEX idx_assets_criticality (Criticality),
    INDEX idx_assets_owner (OwnerID),
    
    CONSTRAINT fk_assets_owner
        FOREIGN KEY (OwnerID) REFERENCES Users(UserID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. INCIDENT TYPES TABLE
-- ============================================================
CREATE TABLE IncidentTypes (
    TypeID INT AUTO_INCREMENT PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT,
    Category ENUM('Malware', 'Phishing', 'Unauthorized Access', 'DDoS', 
                   'Data Breach', 'Insider Threat', 'Policy Violation', 
                   'Physical', 'Social Engineering', 'Other') NOT NULL DEFAULT 'Other',
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 4. SEVERITY LEVELS TABLE
-- ============================================================
CREATE TABLE SeverityLevels (
    SeverityID INT AUTO_INCREMENT PRIMARY KEY,
    SeverityName ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL UNIQUE,
    ResponseSLAHours DECIMAL(5,1) NOT NULL,
    ColorCode VARCHAR(7) NOT NULL,
    Priority INT NOT NULL UNIQUE,
    Description TEXT,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 5. INCIDENTS TABLE (CORE)
-- ============================================================
CREATE TABLE Incidents (
    IncidentID INT AUTO_INCREMENT PRIMARY KEY,
    IncidentRefNo VARCHAR(20) NOT NULL UNIQUE,
    Title VARCHAR(200) NOT NULL,
    Description TEXT,
    ReportedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ReporterID INT NOT NULL,
    TypeID INT NOT NULL,
    SeverityID INT NOT NULL,
    AssetID INT NULL,
    AssignedToID INT NULL,
    Status ENUM('Open', 'In Progress', 'Resolved', 'Closed', 'Reopened') NOT NULL DEFAULT 'Open',
    Resolution TEXT,
    ResolvedAt TIMESTAMP NULL,
    IsDeleted BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_incidents_status (Status),
    INDEX idx_incidents_reporter (ReporterID),
    INDEX idx_incidents_type (TypeID),
    INDEX idx_incidents_severity (SeverityID),
    INDEX idx_incidents_asset (AssetID),
    INDEX idx_incidents_assigned (AssignedToID),
    INDEX idx_incidents_reported (ReportedAt),
    INDEX idx_incidents_refno (IncidentRefNo),
    INDEX idx_incidents_deleted (IsDeleted),
    INDEX idx_incidents_status_reported (Status, ReportedAt),
    
    CONSTRAINT fk_incidents_reporter
        FOREIGN KEY (ReporterID) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_type
        FOREIGN KEY (TypeID) REFERENCES IncidentTypes(TypeID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_severity
        FOREIGN KEY (SeverityID) REFERENCES SeverityLevels(SeverityID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_asset
        FOREIGN KEY (AssetID) REFERENCES Assets(AssetID)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_assigned
        FOREIGN KEY (AssignedToID) REFERENCES Users(UserID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. INCIDENT EVIDENCE TABLE
-- ============================================================
CREATE TABLE IncidentEvidence (
    EvidenceID INT AUTO_INCREMENT PRIMARY KEY,
    IncidentID INT NOT NULL,
    FileName VARCHAR(255) NOT NULL,
    FilePath VARCHAR(500) NOT NULL,
    FileType VARCHAR(50),
    FileSize BIGINT,
    HashValue VARCHAR(64),
    UploadedBy INT NOT NULL,
    UploadedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_evidence_incident (IncidentID),
    
    CONSTRAINT fk_evidence_incident
        FOREIGN KEY (IncidentID) REFERENCES Incidents(IncidentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_evidence_uploader
        FOREIGN KEY (UploadedBy) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. RESPONSE ACTIONS TABLE
-- ============================================================
CREATE TABLE ResponseActions (
    ActionID INT AUTO_INCREMENT PRIMARY KEY,
    IncidentID INT NOT NULL,
    ActionBy INT NOT NULL,
    ActionTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ActionType ENUM('Investigation', 'Containment', 'Eradication', 'Recovery',
                     'Communication', 'Escalation', 'Review', 'Other') NOT NULL DEFAULT 'Investigation',
    Details TEXT NOT NULL,
    DurationMinutes INT,
    IsBillable BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_actions_incident (IncidentID),
    INDEX idx_actions_time (ActionTime),
    INDEX idx_actions_type (ActionType),
    
    CONSTRAINT fk_actions_incident
        FOREIGN KEY (IncidentID) REFERENCES Incidents(IncidentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_actions_user
        FOREIGN KEY (ActionBy) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. ASSIGNMENTS TABLE (History)
-- ============================================================
CREATE TABLE Assignments (
    AssignmentID INT AUTO_INCREMENT PRIMARY KEY,
    IncidentID INT NOT NULL,
    AssignedToID INT NOT NULL,
    AssignedBy INT NOT NULL,
    AssignedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UnassignedAt TIMESTAMP NULL,
    Notes TEXT,
    
    INDEX idx_assignments_incident (IncidentID),
    INDEX idx_assignments_user (AssignedToID),
    
    CONSTRAINT fk_assignments_incident
        FOREIGN KEY (IncidentID) REFERENCES Incidents(IncidentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_to
        FOREIGN KEY (AssignedToID) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_by
        FOREIGN KEY (AssignedBy) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE AuditLogs (
    AuditID BIGINT AUTO_INCREMENT PRIMARY KEY,
    TableName VARCHAR(50) NOT NULL,
    RecordID INT NOT NULL,
    Operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    OldValues JSON,
    NewValues JSON,
    ChangedBy INT,
    ChangedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_table_record (TableName, RecordID),
    INDEX idx_audit_timestamp (ChangedAt),
    INDEX idx_audit_user (ChangedBy),
    
    CONSTRAINT fk_audit_user
        FOREIGN KEY (ChangedBy) REFERENCES Users(UserID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 10. INCIDENT COMMENTS TABLE
-- ============================================================
CREATE TABLE IncidentComments (
    CommentID INT AUTO_INCREMENT PRIMARY KEY,
    IncidentID INT NOT NULL,
    UserID INT NOT NULL,
    CommentText TEXT NOT NULL,
    IsInternal BOOLEAN NOT NULL DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_comments_incident (IncidentID),
    
    CONSTRAINT fk_comments_incident
        FOREIGN KEY (IncidentID) REFERENCES Incidents(IncidentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. PLAYBOOKS TABLE
-- ============================================================
CREATE TABLE Playbooks (
    PlaybookID INT AUTO_INCREMENT PRIMARY KEY,
    TypeID INT NOT NULL,
    Title VARCHAR(200) NOT NULL,
    ProcedureText TEXT NOT NULL,
    ChecklistItems JSON,
    Version VARCHAR(10) NOT NULL DEFAULT '1.0',
    CreatedBy INT NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_playbooks_type (TypeID),
    
    CONSTRAINT fk_playbooks_type
        FOREIGN KEY (TypeID) REFERENCES IncidentTypes(TypeID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_playbooks_creator
        FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. SLA BREACH NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE SLABreachNotifications (
    NotificationID BIGINT AUTO_INCREMENT PRIMARY KEY,
    IncidentID INT NOT NULL,
    SLAHours DECIMAL(5,1) NOT NULL,
    ElapsedHours DECIMAL(5,1) NOT NULL,
    BreachedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    NotifiedTo INT,
    Resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ResolvedAt TIMESTAMP NULL,
    
    INDEX idx_sla_incident (IncidentID),
    INDEX idx_sla_resolved (Resolved),
    
    CONSTRAINT fk_sla_incident
        FOREIGN KEY (IncidentID) REFERENCES Incidents(IncidentID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sla_notified
        FOREIGN KEY (NotifiedTo) REFERENCES Users(UserID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
SELECT 'Schema created successfully' AS Status;