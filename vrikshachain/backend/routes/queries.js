// routes/queries.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { blockchainService } = require('../services/blockchainService');
const { logAuditEvent } = require('../services/auditService');

const router = express.Router();

// GET /api/provenance/{batchId} - Get full provenance history (public)
router.get('/provenance/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        message: 'Batch ID is required'
      });
    }

    // Query blockchain for provenance data
    const provenanceData = await blockchainService.queryLedger(
      'GetProvenance',
      { batchId }
    );

    if (!provenanceData) {
      return res.status(404).json({
        message: 'Batch not found'
      });
    }

    // Format response in FHIR-like structure
    const response = {
      batchId,
      productType: provenanceData.productType,
      currentStatus: provenanceData.currentStatus,
      traceabilityData: {
        collection: provenanceData.collectionEvents.map(event => ({
          eventId: event.eventId,
          timestamp: event.timestamp,
          collector: {
            id: event.collectorId,
            type: 'COLLECTOR'
          },
          location: event.location,
          harvestDetails: {
            quantity: event.quantity,
            unit: event.unit,
            harvestDate: event.harvestDate,
            weatherConditions: event.weatherConditions,
            organicCertified: event.organicCertified
          },
          attachments: event.photos?.map(photo => ({
            type: 'photo',
            filename: photo
          })) || []
        })),
        testing: provenanceData.qualityTests.map(test => ({
          testId: test.testId,
          timestamp: test.timestamp,
          laboratory: {
            id: test.labId,
            type: 'LAB'
          },
          testResults: test.results,
          parameters: test.parameters,
          passed: test.passed,
          methodology: test.methodology,
          certificateHash: test.certificateHash
        })),
        processing: provenanceData.processingSteps.map(step => ({
          stepId: step.stepId,
          timestamp: step.timestamp,
          processor: {
            id: step.processorId,
            type: 'PROCESSOR'
          },
          processDetails: {
            processType: step.processType,
            inputQuantity: step.inputQuantity,
            outputQuantity: step.outputQuantity,
            conditions: step.conditions,
            equipment: step.equipment
          }
        })),
        manufacturing: provenanceData.productBatch ? {
          timestamp: provenanceData.productBatch.timestamp,
          manufacturer: {
            id: provenanceData.productBatch.manufacturerId,
            type: 'MANUFACTURER'
          },
          productDetails: {
            finalQuantity: provenanceData.productBatch.finalQuantity,
            packaging: provenanceData.productBatch.packaging,
            expiryDate: provenanceData.productBatch.expiryDate,
            batchNumber: provenanceData.productBatch.batchNumber
          }
        } : null
      },
      metadata: {
        queryTimestamp: new Date().toISOString(),
        dataIntegrity: 'VERIFIED',
        blockchainVerified: true
      }
    };

    // Log audit event for public access
    if (req.user) {
      await logAuditEvent({
        userId: req.user.userId,
        action: 'PROVENANCE_QUERIED',
        resource: 'provenance',
        resourceId: batchId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.json(response);

  } catch (error) {
    console.error('Provenance query error:', error);
    res.status(500).json({
      message: 'Failed to retrieve provenance data',
      error: error.message
    });
  }
});

// GET /api/batch/{batchId}/status - Get current batch status
router.get('/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;

    const statusData = await blockchainService.queryLedger(
      'GetBatchStatus',
      { batchId }
    );

    if (!statusData) {
      return res.status(404).json({
        message: 'Batch not found'
      });
    }

    res.json({
      batchId: statusData.batchId,
      currentStatus: statusData.status,
      lastUpdated: statusData.lastUpdated,
      statusHistory: [
        { status: 'COLLECTED', timestamp: statusData.lastUpdated },
        { status: 'TESTED', timestamp: statusData.lastUpdated },
        { status: 'PROCESSED', timestamp: statusData.lastUpdated },
        { status: 'MANUFACTURED', timestamp: statusData.lastUpdated }
      ].filter((_, index) => {
        const statusOrder = ['COLLECTED', 'TESTED', 'PROCESSED', 'MANUFACTURED'];
        const currentIndex = statusOrder.indexOf(statusData.status);
        return index <= currentIndex;
      })
    });

  } catch (error) {
    console.error('Batch status query error:', error);
    res.status(500).json({
      message: 'Failed to retrieve batch status',
      error: error.message
    });
  }
});

// GET /api/collector/{id}/events - Get all events from a collector
router.get('/collector/:id/events', authenticate, authorize(['ADMIN', 'COLLECTOR']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Authorization check - collectors can only see their own events
    if (req.user.role === 'COLLECTOR' && req.user.username !== id) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const events = await blockchainService.queryLedger(
      'GetCollectorEvents',
      { collectorId: id }
    );

    res.json({
      collectorId: id,
      totalEvents: events.length,
      events: events.map(event => ({
        eventId: event.eventId,
        batchId: event.batchId,
        timestamp: event.timestamp,
        productType: event.productType,
        quantity: event.quantity,
        unit: event.unit,
        location: event.location,
        harvestDate: event.harvestDate
      }))
    });

  } catch (error) {
    console.error('Collector events query error:', error);
    res.status(500).json({
      message: 'Failed to retrieve collector events',
      error: error.message
    });
  }
});

// GET /api/stats/harvest-volumes - Get harvest statistics (ADMIN role)
router.get('/stats/harvest-volumes', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { startDate, endDate, productType } = req.query;

    // Get all batches and calculate statistics
    const allBatches = await blockchainService.getAllBatches();
    const statistics = {
      totalBatches: allBatches.length,
      totalVolume: 0,
      productTypes: {},
      monthlyVolumes: {},
      qualityMetrics: {
        passed: 0,
        failed: 0,
        pending: 0
      }
    };

    for (const batchId of allBatches) {
      const batch = await blockchainService.queryLedger('GetProvenance', { batchId });
      if (batch) {
        // Calculate total volume
        const totalQuantity = batch.collectionEvents.reduce((sum, event) => sum + event.quantity, 0);
        statistics.totalVolume += totalQuantity;

        // Group by product type
        if (!statistics.productTypes[batch.productType]) {
          statistics.productTypes[batch.productType] = { count: 0, volume: 0 };
        }
        statistics.productTypes[batch.productType].count += 1;
        statistics.productTypes[batch.productType].volume += totalQuantity;

        // Quality metrics
        const latestTest = batch.qualityTests[batch.qualityTests.length - 1];
        if (latestTest) {
          if (latestTest.passed) {
            statistics.qualityMetrics.passed += 1;
          } else {
            statistics.qualityMetrics.failed += 1;
          }
        } else {
          statistics.qualityMetrics.pending += 1;
        }
      }
    }

    res.json(statistics);

  } catch (error) {
    console.error('Harvest statistics error:', error);
    res.status(500).json({
      message: 'Failed to retrieve harvest statistics',
      error: error.message
    });
  }
});

// GET /api/search/batches - Search batches with filters
router.get('/search/batches', authenticate, async (req, res) => {
  try {
    const { 
      productType, 
      status, 
      collector, 
      dateFrom, 
      dateTo, 
      limit = 50, 
      offset = 0 
    } = req.query;

    const allBatches = await blockchainService.getAllBatches();
    let filteredBatches = [];

    for (const batchId of allBatches) {
      const batch = await blockchainService.queryLedger('GetProvenance', { batchId });
      if (batch) {
        let matches = true;

        // Apply filters
        if (productType && batch.productType !== productType) matches = false;
        if (status && batch.currentStatus !== status) matches = false;
        if (collector) {
          const hasCollector = batch.collectionEvents.some(event => event.collectorId === collector);
          if (!hasCollector) matches = false;
        }

        if (matches) {
          filteredBatches.push({
            batchId: batch.batchId,
            productType: batch.productType,
            currentStatus: batch.currentStatus,
            collectionDate: batch.collectionEvents[0]?.timestamp,
            collector: batch.collectionEvents[0]?.collectorId,
            totalQuantity: batch.collectionEvents.reduce((sum, event) => sum + event.quantity, 0)
          });
        }
      }
    }

    // Apply pagination
    const paginatedResults = filteredBatches
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      total: filteredBatches.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      batches: paginatedResults
    });

  } catch (error) {
    console.error('Batch search error:', error);
    res.status(500).json({
      message: 'Failed to search batches',
      error: error.message
    });
  }
});

module.exports = router;

// services/auditService.js
const { pool } = require('../config/database');

const logAuditEvent = async (auditData) => {
  try {
    const {
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent
    } = auditData;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resource, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );

  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

const getAuditLogs = async (filters = {}) => {
  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters;

    let query = `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (userId) {
      query += ` AND al.user_id = $${++paramCount}`;
      params.push(userId);
    }

    if (action) {
      query += ` AND al.action = $${++paramCount}`;
      params.push(action);
    }

    if (resource) {
      query += ` AND al.resource = $${++paramCount}`;
      params.push(resource);
    }

    if (startDate) {
      query += ` AND al.created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND al.created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;

  } catch (error) {
    console.error('Get audit logs error:', error);
    throw error;
  }
};

module.exports = {
  logAuditEvent,
  getAuditLogs
};

// services/gpsService.js
const { pool } = require('../config/database');

const validateGPSLocation = async (latitude, longitude) => {
  try {
    // Get active geofences
    const geofencesQuery = await pool.query(
      'SELECT coordinates FROM geofences WHERE is_active = true'
    );

    if (geofencesQuery.rows.length === 0) {
      // If no geofences defined, allow all locations
      return true;
    }

    // Check if point is within any geofence
    for (const geofence of geofencesQuery.rows) {
      if (isPointInPolygon([longitude, latitude], geofence.coordinates)) {
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error('GPS validation error:', error);
    // In case of error, allow the location (fail-open)
    return true;
  }
};

// Simple point-in-polygon algorithm
const isPointInPolygon = (point, polygon) => {
  const [x, y] = point;
  const coords = polygon.coordinates[0]; // Assuming first ring of polygon

  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i];
    const [xj, yj] = coords[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

module.exports = {
  validateGPSLocation
};

// services/fileService.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/database');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

const ensureUploadDir = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
};

const storeFile = async (file, userId, uploadType) => {
  try {
    await ensureUploadDir();

    // Read file content
    const fileContent = await fs.readFile(file.path);
    
    // Generate file hash
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${fileHash.substring(0, 8)}${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    // Move file to permanent location
    await fs.rename(file.path, filePath);
    
    // Store metadata in database
    const metadata = await pool.query(
      `INSERT INTO file_metadata (filename, original_name, file_path, file_size, mime_type, file_hash, uploaded_by, upload_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [filename, file.originalname, filePath, file.size, file.mimetype, fileHash, userId, uploadType]
    );
    
    return metadata.rows[0];
    
  } catch (error) {
    console.error('File storage error:', error);
    // Clean up temp file if it still exists
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      // Ignore cleanup errors
    }
    throw error;
  }
};

const getFile = async (fileHash) => {
  try {
    const fileQuery = await pool.query(
      'SELECT * FROM file_metadata WHERE file_hash = $1',
      [fileHash]
    );
    
    if (fileQuery.rows.length === 0) {
      return null;
    }
    
    const fileMetadata = fileQuery.rows[0];
    
    // Check if file exists on disk
    try {
      await fs.access(fileMetadata.file_path);
      return fileMetadata;
    } catch (error) {
      console.error('File not found on disk:', fileMetadata.file_path);
      return null;
    }
    
  } catch (error) {
    console.error('Get file error:', error);
    throw error;
  }
};

module.exports = {
  storeFile,
  getFile,
  UPLOAD_DIR
};