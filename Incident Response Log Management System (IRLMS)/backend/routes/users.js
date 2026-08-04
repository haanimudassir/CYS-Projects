const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');


// GET /api/users
router.get('/', authenticate, authorize('Admin', 'Manager'), async (req, res) => {
  try {

    const [users] = await pool.query(`
      SELECT 
        UserID,
        Username,
        Email,
        Role,
        FullName,
        Phone,
        Department,
        IsActive,
        CreatedAt,
        LastLogin,

        (
          SELECT COUNT(*)
          FROM Incidents
          WHERE AssignedToID = UserID
          AND Status IN ('Open', 'In Progress')
        ) AS ActiveIncidents

      FROM Users

      WHERE IsActive = TRUE

      ORDER BY IsActive DESC, FullName ASC
    `);


    res.json({
      success: true,
      data: users
    });


  } catch (error) {

    console.error('List users error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }
});



// GET /api/users/analysts
router.get('/analysts', authenticate, async (req, res) => {

  try {

    const [users] = await pool.query(`
      SELECT 
        UserID,
        FullName,
        Email,
        Role

      FROM Users

      WHERE Role IN ('Analyst', 'Manager')
      AND IsActive = TRUE

      ORDER BY FullName
    `);


    res.json({
      success: true,
      data: users
    });


  } catch (error) {

    console.error('List analysts error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});



// POST /api/users
router.post('/', authenticate, authorize('Admin'), async (req, res) => {

  try {

    const {
      username,
      email,
      password,
      role,
      fullName,
      phone,
      department
    } = req.body;


    if (!username || !email || !password || !role || !fullName) {

      return res.status(400).json({
        success: false,
        message: 'username, email, password, role, and fullName are required'
      });

    }


    const [existing] = await pool.query(
      'SELECT UserID FROM Users WHERE Username = ? OR Email = ?',
      [username, email]
    );


    if (existing.length > 0) {

      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });

    }


    const passwordHash = await bcrypt.hash(password, 10);


    const [result] = await pool.query(
      `
      INSERT INTO Users
      (
        Username,
        Email,
        PasswordHash,
        Role,
        FullName,
        Phone,
        Department
      )

      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        username,
        email,
        passwordHash,
        role,
        fullName,
        phone || null,
        department || null
      ]
    );


    res.status(201).json({

      success: true,

      message: 'User created successfully',

      data: {
        userId: result.insertId
      }

    });


  } catch (error) {

    console.error('Create user error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });

  }

});




// PUT /api/users/:id
router.put('/:id', authenticate, authorize('Admin'), async (req, res) => {

  try {

    const userId = parseInt(req.params.id);

    const {
      role,
      isActive,
      phone,
      department
    } = req.body;



    await pool.query(
      `
      UPDATE Users SET

        Role = COALESCE(?, Role),

        IsActive = COALESCE(?, IsActive),

        Phone = COALESCE(?, Phone),

        Department = COALESCE(?, Department)

      WHERE UserID = ?
      `,
      [
        role,
        isActive,
        phone,
        department,
        userId
      ]
    );


    res.json({

      success: true,

      message: 'User updated successfully'

    });



  } catch (error) {

    console.error('Update user error:', error);

    res.status(500).json({

      success: false,

      message: 'Internal server error'

    });

  }

});


module.exports = router;