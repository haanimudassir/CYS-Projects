const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/meta/types - Incident type lookup list
router.get('/types', authenticate, async (req, res) => {
  try {
    const [types] = await pool.query(
      'SELECT TypeID, TypeName, Category, Description FROM IncidentTypes ORDER BY TypeName ASC'
    );
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('List incident types error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/meta/severities - Severity level lookup list
router.get('/severities', authenticate, async (req, res) => {
  try {
    const [severities] = await pool.query(
      'SELECT SeverityID, SeverityName, ResponseSLAHours, ColorCode, Priority, Description FROM SeverityLevels ORDER BY Priority ASC'
    );
    res.json({ success: true, data: severities });
  } catch (error) {
    console.error('List severities error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
