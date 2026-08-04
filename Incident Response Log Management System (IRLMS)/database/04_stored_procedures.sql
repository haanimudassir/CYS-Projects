-- ============================================================
-- IRLMS - Stored Procedures
-- ============================================================
USE irlms_db;

DELIMITER //

-- ============================================================
-- SP 1: Create Incident (ACID Transaction)
-- ============================================================
DROP PROCEDURE IF EXISTS sp_CreateIncident//
CREATE PROCEDURE sp_CreateIncident(
    IN p_Title VARCHAR(200),
    IN p_Description TEXT,
    IN p_ReporterID INT,
    IN p_TypeID INT,
    IN p_SeverityID INT,
    IN p_AssetID INT,
    OUT p_IncidentID INT,
    OUT p_RefNo VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
        INSERT INTO Incidents (Title, Description, ReporterID, TypeID, SeverityID, AssetID)
        VALUES (p_Title, p_Description, p_ReporterID, p_TypeID, p_SeverityID, p_AssetID);
        
        SET p_IncidentID = LAST_INSERT_ID();
        SELECT IncidentRefNo INTO p_RefNo FROM Incidents WHERE IncidentID = p_IncidentID;
    COMMIT;
END//

-- ============================================================
-- SP 2: Assign Incident to User
-- ============================================================
DROP PROCEDURE IF EXISTS sp_AssignIncident//
CREATE PROCEDURE sp_AssignIncident(
    IN p_IncidentID INT,
    IN p_AssignedToID INT,
    IN p_AssignedByID INT
)
BEGIN
    DECLARE currentStatus VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
        -- Get current status
        SELECT Status INTO currentStatus FROM Incidents WHERE IncidentID = p_IncidentID;
        
        -- Update incident
        UPDATE Incidents 
        SET AssignedToID = p_AssignedToID, 
            Status = CASE 
                WHEN currentStatus = 'Open' THEN 'In Progress'
                ELSE Status
            END,
            UpdatedAt = NOW()
        WHERE IncidentID = p_IncidentID;
        
        -- Log assignment
        INSERT INTO Assignments (IncidentID, AssignedToID, AssignedBy)
        VALUES (p_IncidentID, p_AssignedToID, p_AssignedByID);
    COMMIT;
END//

-- ============================================================
-- SP 3: Close Incident with Resolution
-- ============================================================
DROP PROCEDURE IF EXISTS sp_CloseIncident//
CREATE PROCEDURE sp_CloseIncident(
    IN p_IncidentID INT,
    IN p_Resolution TEXT,
    IN p_ClosedByID INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
        UPDATE Incidents
        SET Status = 'Closed',
            Resolution = p_Resolution,
            ResolvedAt = NOW(),
            UpdatedAt = NOW()
        WHERE IncidentID = p_IncidentID;
        
        INSERT INTO ResponseActions (IncidentID, ActionBy, ActionType, Details, DurationMinutes)
        VALUES (p_IncidentID, p_ClosedByID, 'Review', 
                CONCAT('Incident closed. Resolution: ', LEFT(p_Resolution, 200)), 0);
    COMMIT;
END//

-- ============================================================
-- SP 4: Log Response Action
-- ============================================================
DROP PROCEDURE IF EXISTS sp_LogAction//
CREATE PROCEDURE sp_LogAction(
    IN p_IncidentID INT,
    IN p_ActionBy INT,
    IN p_ActionType VARCHAR(30),
    IN p_Details TEXT,
    IN p_Duration INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
        INSERT INTO ResponseActions (IncidentID, ActionBy, ActionType, Details, DurationMinutes)
        VALUES (p_IncidentID, p_ActionBy, p_ActionType, p_Details, COALESCE(p_Duration, 0));
        
        -- Update incident status if it's Open
        UPDATE Incidents
        SET Status = CASE WHEN Status = 'Open' THEN 'In Progress' ELSE Status END,
            UpdatedAt = NOW()
        WHERE IncidentID = p_IncidentID;
    COMMIT;
END//

-- ============================================================
-- SP 5: Get Dashboard Statistics
-- ============================================================
DROP PROCEDURE IF EXISTS sp_DashboardStats//
CREATE PROCEDURE sp_DashboardStats()
BEGIN
    -- 1. Status distribution
    SELECT Status, COUNT(*) AS Count
    FROM Incidents
    WHERE IsDeleted = FALSE
    GROUP BY Status
    ORDER BY FIELD(Status, 'Open', 'In Progress', 'Resolved', 'Closed', 'Reopened');
    
    -- 2. Open incidents by severity
    SELECT s.SeverityName, s.ColorCode, s.Priority, COUNT(*) AS Count
    FROM Incidents i
    JOIN SeverityLevels s ON i.SeverityID = s.SeverityID
    WHERE i.Status IN ('Open', 'In Progress', 'Reopened') AND i.IsDeleted = FALSE
    GROUP BY s.SeverityID, s.SeverityName, s.ColorCode, s.Priority
    ORDER BY s.Priority;
    
    -- 3. Incidents by type (last 30 days)
    SELECT t.TypeName, t.Category, COUNT(*) AS Count
    FROM Incidents i
    JOIN IncidentTypes t ON i.TypeID = t.TypeID
    WHERE i.CreatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND i.IsDeleted = FALSE
    GROUP BY t.TypeID, t.TypeName, t.Category
    ORDER BY Count DESC;
    
    -- 4. Average resolution time by severity (hours)
    SELECT s.SeverityName, 
           ROUND(AVG(TIMESTAMPDIFF(HOUR, i.ReportedAt, i.ResolvedAt)), 1) AS AvgHours,
           s.ResponseSLAHours
    FROM Incidents i
    JOIN SeverityLevels s ON i.SeverityID = s.SeverityID
    WHERE i.ResolvedAt IS NOT NULL AND i.IsDeleted = FALSE
    GROUP BY s.SeverityID, s.SeverityName, s.ResponseSLAHours;
    
    -- 5. Top 5 affected assets
    SELECT a.Hostname, a.IPAddress, COUNT(i.IncidentID) AS IncidentCount
    FROM Assets a
    LEFT JOIN Incidents i ON a.AssetID = i.AssetID AND i.IsDeleted = FALSE
    GROUP BY a.AssetID, a.Hostname, a.IPAddress
    ORDER BY IncidentCount DESC
    LIMIT 5;
    
    -- 6. SLA breaches
    SELECT COUNT(*) AS SLAViolations
    FROM Incidents i
    JOIN SeverityLevels s ON i.SeverityID = s.SeverityID
    WHERE i.Status IN ('Open', 'In Progress')
      AND TIMESTAMPDIFF(HOUR, i.ReportedAt, NOW()) > s.ResponseSLAHours
      AND i.IsDeleted = FALSE;
END//

-- ============================================================
-- SP 6: Get Incidents with Filters (Pagination)
-- ============================================================
DROP PROCEDURE IF EXISTS sp_GetIncidents//
CREATE PROCEDURE sp_GetIncidents(
    IN p_Page INT,
    IN p_Limit INT,
    IN p_Status VARCHAR(20),
    IN p_SeverityID INT,
    IN p_TypeID INT,
    IN p_AssignedToID INT,
    IN p_Search VARCHAR(100)
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    DECLARE v_WhereClause TEXT DEFAULT 'WHERE i.IsDeleted = FALSE';
    
    SET v_Offset = (p_Page - 1) * p_Limit;
    
    IF p_Status IS NOT NULL AND p_Status != '' THEN
        SET v_WhereClause = CONCAT(v_WhereClause, ' AND i.Status = ', QUOTE(p_Status));
    END IF;
    
    IF p_SeverityID IS NOT NULL THEN
        SET v_WhereClause = CONCAT(v_WhereClause, ' AND i.SeverityID = ', CAST(p_SeverityID AS UNSIGNED));
    END IF;
    
    IF p_TypeID IS NOT NULL THEN
        SET v_WhereClause = CONCAT(v_WhereClause, ' AND i.TypeID = ', CAST(p_TypeID AS UNSIGNED));
    END IF;
    
    IF p_AssignedToID IS NOT NULL THEN
        SET v_WhereClause = CONCAT(v_WhereClause, ' AND i.AssignedToID = ', CAST(p_AssignedToID AS UNSIGNED));
    END IF;
    
    IF p_Search IS NOT NULL AND p_Search != '' THEN
        SET v_WhereClause = CONCAT(v_WhereClause, ' AND (i.Title LIKE ', QUOTE(CONCAT('%', p_Search, '%')),
                                   ' OR i.IncidentRefNo LIKE ', QUOTE(CONCAT('%', p_Search, '%')), ')');
    END IF;
    
    SET @query = CONCAT(
        'SELECT i.*, r.FullName AS ReporterName, a.FullName AS AssigneeName, ',
        't.TypeName, s.SeverityName, s.ColorCode, ast.Hostname ',
        'FROM Incidents i ',
        'LEFT JOIN Users r ON i.ReporterID = r.UserID ',
        'LEFT JOIN Users a ON i.AssignedToID = a.UserID ',
        'LEFT JOIN IncidentTypes t ON i.TypeID = t.TypeID ',
        'LEFT JOIN SeverityLevels s ON i.SeverityID = s.SeverityID ',
        'LEFT JOIN Assets ast ON i.AssetID = ast.AssetID ',
        v_WhereClause,
        ' ORDER BY i.ReportedAt DESC ',
        'LIMIT ', p_Limit, ' OFFSET ', v_Offset
    );
    
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    -- Return total count
    SET @countQuery = CONCAT(
        'SELECT COUNT(*) AS Total FROM Incidents i ', v_WhereClause
    );
    PREPARE countStmt FROM @countQuery;
    EXECUTE countStmt;
    DEALLOCATE PREPARE countStmt;
END//

-- ============================================================
-- SP 7: Get Incident Detail with All Related Data
-- ============================================================
DROP PROCEDURE IF EXISTS sp_GetIncidentDetail//
CREATE PROCEDURE sp_GetIncidentDetail(IN p_IncidentID INT)
BEGIN
    -- Main incident
    SELECT i.*, r.FullName AS ReporterName, r.Email AS ReporterEmail,
           a.FullName AS AssigneeName, t.TypeName, t.Category,
           s.SeverityName, s.ColorCode, s.ResponseSLAHours,
           ast.Hostname, ast.IPAddress, ast.AssetType
    FROM Incidents i
    LEFT JOIN Users r ON i.ReporterID = r.UserID
    LEFT JOIN Users a ON i.AssignedToID = a.UserID
    LEFT JOIN IncidentTypes t ON i.TypeID = t.TypeID
    LEFT JOIN SeverityLevels s ON i.SeverityID = s.SeverityID
    LEFT JOIN Assets ast ON i.AssetID = ast.AssetID
    WHERE i.IncidentID = p_IncidentID;
    
    -- Response actions
    SELECT ra.*, u.FullName AS ActionByName
    FROM ResponseActions ra
    LEFT JOIN Users u ON ra.ActionBy = u.UserID
    WHERE ra.IncidentID = p_IncidentID
    ORDER BY ra.ActionTime DESC;
    
    -- Comments
    SELECT c.*, u.FullName AS CommentByName
    FROM IncidentComments c
    LEFT JOIN Users u ON c.UserID = u.UserID
    WHERE c.IncidentID = p_IncidentID
    ORDER BY c.CreatedAt DESC;
    
    -- Assignment history
    SELECT asg.*, u1.FullName AS AssignedToName, u2.FullName AS AssignedByName
    FROM Assignments asg
    LEFT JOIN Users u1 ON asg.AssignedToID = u1.UserID
    LEFT JOIN Users u2 ON asg.AssignedBy = u2.UserID
    WHERE asg.IncidentID = p_IncidentID
    ORDER BY asg.AssignedAt DESC;
    
    -- Evidence
    SELECT * FROM IncidentEvidence
    WHERE IncidentID = p_IncidentID;
    
    -- SLA notification (if any)
    SELECT * FROM SLABreachNotifications
    WHERE IncidentID = p_IncidentID
    ORDER BY BreachedAt DESC;
END//

-- ============================================================
-- SP 8: Detect SLA Breaches
-- ============================================================
DROP PROCEDURE IF EXISTS sp_CheckSLABreaches//
CREATE PROCEDURE sp_CheckSLABreaches()
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
    
    SELECT ROW_COUNT() AS NewBreachesDetected;
END//

-- ============================================================
-- SP 9: Generate Monthly Report
-- ============================================================
DROP PROCEDURE IF EXISTS sp_GenerateMonthlyReport//
CREATE PROCEDURE sp_GenerateMonthlyReport(IN p_Year INT, IN p_Month INT)
BEGIN
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;
    
    SET v_StartDate = DATE(CONCAT(p_Year, '-', LPAD(p_Month, 2, '0'), '-01'));
    SET v_EndDate = LAST_DAY(v_StartDate);
    
    SELECT 
        COUNT(*) AS TotalIncidents,
        SUM(CASE WHEN Status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS ResolvedCount,
        SUM(CASE WHEN Status IN ('Open', 'In Progress', 'Reopened') THEN 1 ELSE 0 END) AS OpenCount,
        ROUND(AVG(CASE WHEN ResolvedAt IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, ReportedAt, ResolvedAt) END), 1) AS AvgResolutionHours,
        (SELECT COUNT(*) FROM SLABreachNotifications 
         WHERE BreachedAt BETWEEN v_StartDate AND v_EndDate) AS SLABreaches,
        (SELECT COUNT(DISTINCT AssetID) FROM Incidents 
         WHERE CreatedAt BETWEEN v_StartDate AND v_EndDate AND AssetID IS NOT NULL) AS AffectedAssets
    FROM Incidents
    WHERE CreatedAt BETWEEN v_StartDate AND v_EndDate
      AND IsDeleted = FALSE;
END//

DELIMITER ;

SELECT 'Stored procedures created successfully' AS Status;