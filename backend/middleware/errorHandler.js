const { logAuditEvent } = require('../services/auditService');

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.userId || 'anonymous'
  });

  // Log error to audit system if user is authenticated
  if (req.user) {
    logAuditEvent({
      userId: req.user.userId,
      action: 'ERROR_OCCURRED',
      details: {
        error: err.message,
        endpoint: req.originalUrl,
        method: req.method
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).catch(auditError => {
      console.error('Failed to log error to audit system:', auditError);
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Authentication failed'
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      message: 'Resource already exists'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      message: 'Invalid reference to related resource'
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'File too large'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      message: 'Too many files'
    });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      message: err.message
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' ? 
      (statusCode === 500 ? 'Internal Server Error' : message) : 
      message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;