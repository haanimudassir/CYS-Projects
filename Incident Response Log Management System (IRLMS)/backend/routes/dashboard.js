const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');


// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [results] = await pool.query('CALL sp_DashboardStats()');

    res.json({
      success: true,
      data: {
        statusDistribution: results[0] || [],
        severityDistribution: results[1] || [],
        incidentsByType: results[2] || [],
        avgResolutionTime: results[3] || [],
        topAffectedAssets: results[4] || [],
        slaViolations: results[5]?.[0]?.SLAViolations || 0
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);

    res.status(500).json({
      success: false,
      message: error.sqlMessage || 'Internal server error'
    });
  }
});


// GET /api/dashboard/recent
router.get('/recent', authenticate, async (req, res) => {
  try {

    const [incidents] = await pool.query(`
      SELECT 
        i.IncidentID,
        i.IncidentRefNo,
        i.Title,
        i.Status,
        i.ReportedAt,
        s.SeverityName,
        s.ColorCode,
        t.TypeName,
        u.FullName AS AssigneeName

      FROM Incidents i

      JOIN SeverityLevels s 
        ON i.SeverityID = s.SeverityID

      JOIN IncidentTypes t 
        ON i.TypeID = t.TypeID

      LEFT JOIN Users u 
        ON i.AssignedToID = u.UserID

      WHERE i.IsDeleted = FALSE

      ORDER BY i.ReportedAt DESC

      LIMIT 10
    `);


    res.json({
      success: true,
      data: incidents
    });


  } catch (error) {

    console.error('Recent incidents error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }
});



// GET /api/dashboard/alert-stats
router.get('/alert-stats', authenticate, async (req, res) => {

  try {

    const [results] = await pool.query(`
      SELECT

        COUNT(*) AS TotalOpen,

        SUM(
          CASE 
            WHEN TIMESTAMPDIFF(HOUR, ReportedAt, NOW()) > s.ResponseSLAHours 
            THEN 1 
            ELSE 0 
          END
        ) AS SLAWarning,

        SUM(
          CASE 
            WHEN i.SeverityID = 1 
            THEN 1 
            ELSE 0 
          END
        ) AS CriticalOpen,

        SUM(
          CASE 
            WHEN i.SeverityID = 2 
            THEN 1 
            ELSE 0 
          END
        ) AS HighOpen


      FROM Incidents i

      JOIN SeverityLevels s 
        ON i.SeverityID = s.SeverityID

      WHERE i.Status IN ('Open', 'In Progress', 'Reopened')

      AND i.IsDeleted = FALSE
    `);


    res.json({
      success: true,
      data: results[0] || {
        TotalOpen: 0,
        SLAWarning: 0,
        CriticalOpen: 0,
        HighOpen: 0
      }
    });


  } catch (error) {

    console.error('Alert stats error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});


module.exports = router;