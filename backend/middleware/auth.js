// middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is valid
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sessionQuery = await pool.query(
      'SELECT id FROM sessions WHERE token_hash = $1 AND is_valid = true AND expires_at > NOW()',
      [tokenHash]
    );

    if (sessionQuery.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Check if user still exists and is active
    const userQuery = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].is_active) {
      return res.status(401).json({
        message: 'User account not found or deactivated'
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      message: 'Authentication failed'
    });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};