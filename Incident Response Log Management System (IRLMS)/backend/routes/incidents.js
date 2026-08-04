const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { incidentValidation } = require('../middleware/validation');

const EVIDENCE_DIR = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', 'evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, EVIDENCE_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024 },
});

// GET /api/incidents - List incidents with pagination & filters
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status, severityId, typeId, assignedToId, search } = req.query;

    const [results] = await pool.query(
      'CALL sp_GetIncidents(?, ?, ?, ?, ?, ?, ?)',
      [page, limit, status || null, severityId || null, typeId || null, assignedToId || null, search || null]
    );

    // sp_GetIncidents returns two result sets: data rows then total count
    const incidents = results[0];
    const total = results[1]?.[0]?.Total || 0;

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('List incidents error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/incidents/:id - Incident detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [results] = await pool.query('CALL sp_GetIncidentDetail(?)', [parseInt(req.params.id)]);

    if (!results[0] || results[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.json({
      success: true,
      data: {
        incident: results[0][0],
        actions: results[1] || [],
        comments: results[2] || [],
        assignments: results[3] || [],
        evidence: results[4] || [],
        slaNotifications: results[5] || []
      }
    });
  } catch (error) {
    console.error('Get incident detail error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/incidents - Create incident
router.post('/', authenticate, authorize('Analyst', 'Manager', 'Admin'), incidentValidation, async (req, res) => {
  try {
    const { title, description, typeId, severityId, assetId } = req.body;

    const [result] = await pool.query(
      'CALL sp_CreateIncident(?, ?, ?, ?, ?, ?, @incId, @refNo)',
      [title, description, req.user.userId, typeId, severityId, assetId || null]
    );

    const [output] = await pool.query('SELECT @incId AS IncidentID, @refNo AS IncidentRefNo');

    res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: output[0]
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/incidents/:id - Update incident
router.put('/:id', authenticate, authorize('Analyst', 'Manager', 'Admin'), async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id);
    const { title, description, typeId, severityId, assetId, status, resolution } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM Incidents WHERE IncidentID = ? AND IsDeleted = FALSE',
      [incidentId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Role check: Analysts can only update their own incidents
    if (req.user.role === 'Analyst' && existing[0].AssignedToID !== req.user.userId && existing[0].ReporterID !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only update incidents assigned to or reported by you' });
    }

    await pool.query(
      `UPDATE Incidents SET 
        Title = COALESCE(?, Title),
        Description = COALESCE(?, Description),
        TypeID = COALESCE(?, TypeID),
        SeverityID = COALESCE(?, SeverityID),
        AssetID = ?,
        Status = COALESCE(?, Status),
        Resolution = COALESCE(?, Resolution),
        UpdatedAt = NOW()
      WHERE IncidentID = ?`,
      [title, description, typeId, severityId, assetId ?? null, status, resolution, incidentId]
    );

    res.json({ success: true, message: 'Incident updated successfully' });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/incidents/:id/assign - Assign incident
router.post('/:id/assign', authenticate, authorize('Manager', 'Admin'), async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id);
    const { assignedToId } = req.body;

    if (!assignedToId) {
      return res.status(400).json({ success: false, message: 'assignedToId is required' });
    }

    await pool.query('CALL sp_AssignIncident(?, ?, ?)', [incidentId, assignedToId, req.user.userId]);

    res.json({ success: true, message: 'Incident assigned successfully' });
  } catch (error) {
    console.error('Assign incident error:', error);
    res.status(500).json({ success: false, message: error.sqlMessage || 'Internal server error' });
  }
});

// POST /api/incidents/:id/actions - Log response action
router.post('/:id/actions', authenticate, authorize('Analyst', 'Manager', 'Admin'), async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id);
    const { actionType, details, durationMinutes } = req.body;

    if (!actionType || !details) {
      return res.status(400).json({ success: false, message: 'actionType and details are required' });
    }

    await pool.query('CALL sp_LogAction(?, ?, ?, ?, ?)',
      [incidentId, req.user.userId, actionType, details, durationMinutes || null]);

    res.status(201).json({ success: true, message: 'Action logged successfully' });
  } catch (error) {
    console.error('Log action error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/incidents/:id/comments - Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id);
    const { commentText, isInternal } = req.body;

    if (!commentText) {
      return res.status(400).json({ success: false, message: 'commentText is required' });
    }

    await pool.query(
      'INSERT INTO IncidentComments (IncidentID, UserID, CommentText, IsInternal) VALUES (?, ?, ?, ?)',
      [incidentId, req.user.userId, commentText, isInternal !== false]
    );

    res.status(201).json({ success: true, message: 'Comment added successfully' });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/incidents/:id - Soft delete
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id);

    await pool.query(
      'UPDATE Incidents SET IsDeleted = TRUE, UpdatedAt = NOW() WHERE IncidentID = ?',
      [incidentId]
    );

    res.json({ success: true, message: 'Incident deleted successfully' });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/incidents/:id/evidence - Upload an evidence file for an incident
router.post(
  '/:id/evidence',
  authenticate,
  authorize('Analyst', 'Manager', 'Admin'),
  evidenceUpload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    try {
      const incidentId = parseInt(req.params.id);

      const fileBuffer = fs.readFileSync(req.file.path);
      const hashValue = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const relativePath = path.join('evidence', req.file.filename).replace(/\\/g, '/');

      const [result] = await pool.query(
        `INSERT INTO IncidentEvidence (IncidentID, FileName, FilePath, FileType, FileSize, HashValue, UploadedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [incidentId, req.file.originalname, relativePath, req.file.mimetype, req.file.size, hashValue, req.user.userId]
      );

      res.status(201).json({
        success: true,
        message: 'Evidence uploaded successfully',
        data: {
          evidenceId: result.insertId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          hashValue,
        },
      });
    } catch (error) {
      // Clean up the orphaned file on disk if the DB insert failed (e.g. bad incident ID)
      fs.unlink(req.file.path, () => {});
      console.error('Upload evidence error:', error);
      res.status(500).json({ success: false, message: error.sqlMessage || 'Internal server error' });
    }
  }
);

// GET /api/incidents/:id/evidence - List evidence for an incident
router.get('/:id/evidence', authenticate, async (req, res) => {
  try {
    const incidentId = parseInt(req.params.id);
    const [rows] = await pool.query(
      `SELECT e.EvidenceID, e.FileName, e.FileType, e.FileSize, e.HashValue, e.UploadedAt, u.FullName AS UploadedByName
       FROM IncidentEvidence e
       LEFT JOIN Users u ON e.UploadedBy = u.UserID
       WHERE e.IncidentID = ?
       ORDER BY e.UploadedAt DESC`,
      [incidentId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List evidence error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/incidents/:id/evidence/:evidenceId/download - Download an evidence file
router.get('/:id/evidence/:evidenceId/download', authenticate, async (req, res) => {
  try {
    const { id, evidenceId } = req.params;
    const [rows] = await pool.query(
      'SELECT FileName, FilePath FROM IncidentEvidence WHERE EvidenceID = ? AND IncidentID = ?',
      [evidenceId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Evidence not found' });
    }

    const uploadRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    const absolutePath = path.join(uploadRoot, rows[0].FilePath);

    // Guard against the resolved path ever escaping the uploads directory
    if (!absolutePath.startsWith(uploadRoot)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'File missing from storage' });
    }

    res.download(absolutePath, rows[0].FileName);
  } catch (error) {
    console.error('Download evidence error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/incidents/:id/evidence/:evidenceId - Remove an evidence file
router.delete(
  '/:id/evidence/:evidenceId',
  authenticate,
  authorize('Manager', 'Admin'),
  async (req, res) => {
    try {
      const { id, evidenceId } = req.params;
      const [rows] = await pool.query(
        'SELECT FilePath FROM IncidentEvidence WHERE EvidenceID = ? AND IncidentID = ?',
        [evidenceId, id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Evidence not found' });
      }

      await pool.query('DELETE FROM IncidentEvidence WHERE EvidenceID = ?', [evidenceId]);

      const uploadRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
      fs.unlink(path.join(uploadRoot, rows[0].FilePath), () => {});

      res.json({ success: true, message: 'Evidence deleted successfully' });
    } catch (error) {
      console.error('Delete evidence error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;