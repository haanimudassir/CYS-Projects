const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');


// GET /api/actions - Get recent actions
router.get('/', authenticate, async (req, res) => {
  try {

    const limit = parseInt(req.query.limit) || 20;


    const [actions] = await pool.query(`
      SELECT 
        ra.*,
        u.FullName AS ActionByName,
        i.IncidentRefNo,
        i.Title AS IncidentTitle

      FROM ResponseActions ra

      JOIN Users u 
        ON ra.ActionBy = u.UserID

      JOIN Incidents i 
        ON ra.IncidentID = i.IncidentID

      WHERE i.IsDeleted = FALSE

      ORDER BY ra.ActionTime DESC

      LIMIT ?
    `, [limit]);


    res.json({
      success: true,
      data: actions
    });


  } catch (error) {

    console.error('List actions error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }
});


module.exports = router;