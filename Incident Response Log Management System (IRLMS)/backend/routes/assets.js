const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// GET /api/assets - List all assets
router.get('/', authenticate, async (req, res) => {
  try {
    const [assets] = await pool.query(`
      SELECT 
        a.*, 
        u.FullName AS OwnerName,
        (
          SELECT COUNT(*) 
          FROM Incidents 
          WHERE AssetID = a.AssetID 
          AND IsDeleted = FALSE
        ) AS IncidentCount
      FROM Assets a
      LEFT JOIN Users u ON a.OwnerID = u.UserID
      ORDER BY a.Criticality ASC, a.Hostname ASC
    `);

    res.json({
      success: true,
      data: assets
    });

  } catch (error) {
    console.error('List assets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// GET /api/assets/:id - Get single asset
router.get('/:id', authenticate, async (req, res) => {
  try {
    const assetId = parseInt(req.params.id);

    const [assets] = await pool.query(`
      SELECT 
        a.*, 
        u.FullName AS OwnerName
      FROM Assets a
      LEFT JOIN Users u ON a.OwnerID = u.UserID
      WHERE a.AssetID = ?
    `, [assetId]);

    if (assets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    res.json({
      success: true,
      data: assets[0]
    });

  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// POST /api/assets - Create asset
router.post('/', authenticate, authorize('Manager', 'Admin'), async (req, res) => {
  try {
    const {
      hostname,
      ipAddress,
      macAddress,
      os,
      assetType,
      location,
      criticality,
      ownerId
    } = req.body;


    if (!hostname || !assetType) {
      return res.status(400).json({
        success: false,
        message: 'hostname and assetType are required'
      });
    }


    const [result] = await pool.query(
      `
      INSERT INTO Assets
      (
        Hostname,
        IPAddress,
        MACAddress,
        OS,
        AssetType,
        Location,
        Criticality,
        OwnerID
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        hostname,
        ipAddress || null,
        macAddress || null,
        os || null,
        assetType,
        location || null,
        criticality || 'Medium',
        ownerId || null
      ]
    );


    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: {
        assetId: result.insertId
      }
    });


  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// PUT /api/assets/:id - Update asset
router.put('/:id', authenticate, authorize('Manager', 'Admin'), async (req, res) => {

  try {

    const assetId = parseInt(req.params.id);

    const {
      hostname,
      ipAddress,
      macAddress,
      os,
      assetType,
      location,
      criticality,
      ownerId
    } = req.body;


    await pool.query(
      `
      UPDATE Assets SET

        Hostname = COALESCE(?, Hostname),
        IPAddress = ?,
        MACAddress = ?,
        OS = COALESCE(?, OS),
        AssetType = COALESCE(?, AssetType),
        Location = ?,
        Criticality = COALESCE(?, Criticality),
        OwnerID = ?

      WHERE AssetID = ?
      `,
      [
        hostname,
        ipAddress ?? null,
        macAddress ?? null,
        os,
        assetType,
        location ?? null,
        criticality,
        ownerId ?? null,
        assetId
      ]
    );


    res.json({
      success: true,
      message: 'Asset updated successfully'
    });


  } catch (error) {

    console.error('Update asset error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});


// DELETE /api/assets/:id - Delete asset
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {

  try {

    const assetId = parseInt(req.params.id);

    await pool.query(
      'DELETE FROM Assets WHERE AssetID = ?',
      [assetId]
    );


    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });


  } catch (error) {

    console.error('Delete asset error:', error);

    res.status(500).json({
      success: false,
      message: error.sqlMessage || 'Cannot delete asset with existing incidents'
    });

  }

});


module.exports = router;