const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');


// GET /api/reports/summary
router.get('/summary', authenticate, authorize('Manager', 'Admin', 'Auditor'), async (req, res) => {
  try {

    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const [results] = await pool.query(
      'CALL sp_GenerateMonthlyReport(?, ?)',
      [year, month]
    );

    res.json({
      success: true,
      data: results[0]?.[0] || {}
    });


  } catch (error) {

    console.error('Report summary error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }
});



// GET /api/reports/analyst-performance
router.get('/analyst-performance', authenticate, authorize('Manager', 'Admin'), async (req, res) => {

  try {

    const [data] = await pool.query(
      'SELECT * FROM vw_AnalystPerformance ORDER BY ResolvedCount DESC'
    );

    res.json({
      success: true,
      data
    });


  } catch (error) {

    console.error('Analyst performance error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});



// GET /api/reports/asset-risk
router.get('/asset-risk', authenticate, authorize('Manager', 'Admin', 'Auditor'), async (req, res) => {

  try {

    const [data] = await pool.query(
      'SELECT * FROM vw_AssetRiskAssessment ORDER BY Criticality ASC, TotalIncidents DESC'
    );

    res.json({
      success: true,
      data
    });


  } catch (error) {

    console.error('Asset risk error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});



// GET /api/reports/export
router.get('/export', authenticate, authorize('Manager', 'Admin'), async (req, res) => {

  try {

    const {
      status,
      severityId,
      typeId,
      startDate,
      endDate
    } = req.query;


    let query = `
      SELECT 
        i.IncidentRefNo,
        i.Title,
        t.TypeName,
        s.SeverityName,
        i.Status,
        i.ReportedAt,
        i.ResolvedAt,
        r.FullName AS ReporterName,
        a.FullName AS AssigneeName,
        ast.Hostname,

        CASE 
          WHEN i.Status IN ('Open', 'In Progress')
          AND TIMESTAMPDIFF(HOUR, i.ReportedAt, NOW()) > s.ResponseSLAHours
          THEN 'BREACHED'
          ELSE 'OK'
        END AS SLAStatus

      FROM Incidents i

      JOIN IncidentTypes t 
        ON i.TypeID = t.TypeID

      JOIN SeverityLevels s 
        ON i.SeverityID = s.SeverityID

      LEFT JOIN Users r 
        ON i.ReporterID = r.UserID

      LEFT JOIN Users a 
        ON i.AssignedToID = a.UserID

      LEFT JOIN Assets ast 
        ON i.AssetID = ast.AssetID

      WHERE i.IsDeleted = FALSE
    `;


    const params = [];


    if (status) {
      query += ' AND i.Status = ?';
      params.push(status);
    }


    if (severityId) {
      query += ' AND i.SeverityID = ?';
      params.push(parseInt(severityId));
    }


    if (typeId) {
      query += ' AND i.TypeID = ?';
      params.push(parseInt(typeId));
    }


    if (startDate) {
      query += ' AND i.ReportedAt >= ?';
      params.push(startDate);
    }


    if (endDate) {
      query += ' AND i.ReportedAt <= ?';
      params.push(endDate);
    }


    query += ' ORDER BY i.ReportedAt DESC';


    const [incidents] = await pool.query(query, params);


    res.json({
      success: true,
      data: incidents
    });


  } catch (error) {

    console.error('Export error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});


module.exports = router;