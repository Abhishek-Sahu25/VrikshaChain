// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAuditEvent } = require('../services/auditService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login - User authentication
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const userQuery = await pool.query(
      'SELECT id, username, email, password, role, full_name, organization, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const user = userQuery.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Store session for token management
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      action: 'LOGIN',
      details: { method: 'email_password' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        organization: user.organization
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/register - User registration (admin function)
router.post('/register', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      fullName,
      organization
    } = req.body;

    // Validation
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        message: 'Username, email, password, and role are required'
      });
    }

    const validRoles = ['COLLECTOR', 'LAB', 'PROCESSOR', 'MANUFACTURER', 'ADMIN', 'CONSUMER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role specified'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (username, email, password, role, full_name, organization)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role, full_name, organization, created_at`,
      [username, email, hashedPassword, role, fullName, organization]
    );

    // Log audit event
    await logAuditEvent({
      userId: req.user.userId,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: newUser.rows[0].id.toString(),
      details: { 
        createdUser: {
          username,
          email,
          role
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'User created successfully',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/refresh - Token refresh
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const currentToken = req.header('Authorization')?.replace('Bearer ', '');
    const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    // Verify current session is valid
    const sessionQuery = await pool.query(
      'SELECT id FROM sessions WHERE token_hash = $1 AND is_valid = true AND expires_at > NOW()',
      [currentTokenHash]
    );

    if (sessionQuery.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid or expired session'
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        username: req.user.username
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Invalidate old token
    await pool.query(
      'UPDATE sessions SET is_valid = false WHERE token_hash = $1',
      [currentTokenHash]
    );

    // Store new session
    const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [req.user.userId, newTokenHash, expiresAt]
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Invalidate session
    await pool.query(
      'UPDATE sessions SET is_valid = false WHERE token_hash = $1',
      [tokenHash]
    );

    // Log audit event
    await logAuditEvent({
      userId: req.user.userId,
      action: 'LOGOUT',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userQuery = await pool.query(
      `SELECT id, username, email, role, full_name, organization, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user: userQuery.rows[0]
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
