// services/blockchainService.js
const crypto = require('crypto');
const { pool } = require('../config/database');

// Mock blockchain service (replace with actual Hyperledger Fabric client in production)
class BlockchainService {
  constructor() {
    this.network = null;
    this.contract = null;
    this.connected = false;
    this.mockLedger = new Map(); // In-memory storage for demo
  }

  async initializeBlockchain() {
    try {
      // In production, this would initialize Hyperledger Fabric connection
      console.log('🔗 Initializing blockchain connection...');
      
      // Simulate connection setup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.connected = true;
      console.log('✅ Blockchain connection established (mock)');
      
      // Initialize with some sample data
      await this.initializeSampleData();
      
    } catch (error) {
      console.error('❌ Blockchain initialization failed:', error);
      throw error;
    }
  }

  async initializeSampleData() {
    // Add some sample data to demonstrate the system
    const sampleBatch = {
      batchId: 'BATCH-001',
      productType: 'Organic Turmeric',
      currentStatus: 'MANUFACTURED',
      collectionEvents: [{
        eventId: 'COL-001',
        collectorId: 'farmer1',
        timestamp: new Date('2024-01-15').toISOString(),
        location: { latitude: 19.1234, longitude: 74.8567 },
        quantity: '100',
        unit: 'kg',
        photos: ['photo1.jpg'],
        weatherConditions: 'Sunny, 25°C'
      }],
      qualityTests: [{
        testId: 'TEST-001',
        labId: 'lab1',
        timestamp: new Date('2024-01-16').toISOString(),
        parameters: {
          purity: '99.5%',
          moisture: '8.2%',
          curcumin: '3.8%'
        },
        certificateHash: 'abc123def456',
        passed: true
      }],
      processingSteps: [{
        stepId: 'PROC-001',
        processorId: 'processor1',
        timestamp: new Date('2024-01-17').toISOString(),
        processType: 'Cleaning and Grinding',
        inputQuantity: '100',
        outputQuantity: '95',
        conditions: {
          temperature: '40°C',
          humidity: '15%'
        }
      }],
      productBatch: {
        batchId: 'BATCH-001',
        manufacturerId: 'manufacturer1',
        timestamp: new Date('2024-01-18').toISOString(),
        finalQuantity: '90',
        packaging: '1kg pouches',
        expiryDate: new Date('2025-01-18').toISOString(),
        qrCodes: ['QR001', 'QR002', 'QR003']
      }
    };

    this.mockLedger.set('BATCH-001', sampleBatch);
  }

  async submitTransaction(functionName, args, userId) {
    if (!this.connected) {
      throw new Error('Blockchain not connected');
    }

    try {
      const transactionId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Log transaction to database
      await pool.query(
        `INSERT INTO blockchain_transactions (transaction_id, function_name, parameters, submitted_by, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [transactionId, functionName, JSON.stringify(args), userId, 'PENDING']
      );

      // Simulate blockchain transaction processing
      await new Promise(resolve => setTimeout(resolve, 500));

      let result;
      switch (functionName) {
        case 'CreateCollectionEvent':
          result = await this.handleCreateCollectionEvent(args);
          break;
        case 'CreateQualityTest':
          result = await this.handleCreateQualityTest(args);
          break;
        case 'CreateProcessingStep':
          result = await this.handleCreateProcessingStep(args);
          break;
        case 'CreateProductBatch':
          result = await this.handleCreateProductBatch(args);
          break;
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      // Update transaction status
      await pool.query(
        `UPDATE blockchain_transactions 
         SET status = $1, response = $2, confirmed_at = NOW()
         WHERE transaction_id = $3`,
        ['SUCCESS', JSON.stringify(result), transactionId]
      );

      return { transactionId, result };

    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  async handleCreateCollectionEvent(args) {
    const { batchId, collectionData } = args;
    const eventId = `COL-${Date.now()}`;

    let batch = this.mockLedger.get(batchId) || {
      batchId,
      productType: collectionData.productType,
      currentStatus: 'COLLECTED',
      collectionEvents: [],
      qualityTests: [],
      processingSteps: [],
      productBatch: null
    };

    const event = {
      eventId,
      ...collectionData,
      timestamp: new Date().toISOString()
    };

    batch.collectionEvents.push(event);
    batch.currentStatus = 'COLLECTED';
    this.mockLedger.set(batchId, batch);

    return { eventId, batchId, status: 'SUCCESS' };
  }

  async handleCreateQualityTest(args) {
    const { batchId, testData } = args;
    const testId = `TEST-${Date.now()}`;

    const batch = this.mockLedger.get(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const test = {
      testId,
      ...testData,
      timestamp: new Date().toISOString()
    };

    batch.qualityTests.push(test);
    batch.currentStatus = 'TESTED';
    this.mockLedger.set(batchId, batch);

    return { testId, batchId, status: 'SUCCESS' };
  }

  async handleCreateProcessingStep(args) {
    const { batchId, processingData } = args;
    const stepId = `PROC-${Date.now()}`;

    const batch = this.mockLedger.get(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const step = {
      stepId,
      ...processingData,
      timestamp: new Date().toISOString()
    };

    batch.processingSteps.push(step);
    batch.currentStatus = 'PROCESSED';
    this.mockLedger.set(batchId, batch);

    return { stepId, batchId, status: 'SUCCESS' };
  }

  async handleCreateProductBatch(args) {
    const { batchId, productData } = args;

    const batch = this.mockLedger.get(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const product = {
      ...productData,
      timestamp: new Date().toISOString()
    };

    batch.productBatch = product;
    batch.currentStatus = 'MANUFACTURED';
    this.mockLedger.set(batchId, batch);

    return { batchId, status: 'SUCCESS' };
  }

  async queryLedger(functionName, args) {
    if (!this.connected) {
      throw new Error('Blockchain not connected');
    }

    try {
      switch (functionName) {
        case 'GetProvenance':
          return this.getProvenance(args.batchId);
        case 'GetBatchStatus':
          return this.getBatchStatus(args.batchId);
        case 'GetCollectorEvents':
          return this.getCollectorEvents(args.collectorId);
        default:
          throw new Error(`Unknown query function: ${functionName}`);
      }
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  async getProvenance(batchId) {
    const batch = this.mockLedger.get(batchId);
    if (!batch) {
      return null;
    }
    return batch;
  }

  async getBatchStatus(batchId) {
    const batch = this.mockLedger.get(batchId);
    if (!batch) {
      return null;
    }
    return {
      batchId,
      status: batch.currentStatus,
      lastUpdated: batch.productBatch?.timestamp || 
                   batch.processingSteps[batch.processingSteps.length - 1]?.timestamp ||
                   batch.qualityTests[batch.qualityTests.length - 1]?.timestamp ||
                   batch.collectionEvents[batch.collectionEvents.length - 1]?.timestamp
    };
  }

  async getCollectorEvents(collectorId) {
    const events = [];
    for (const [batchId, batch] of this.mockLedger.entries()) {
      const collectorEvents = batch.collectionEvents.filter(
        event => event.collectorId === collectorId
      );
      events.push(...collectorEvents.map(event => ({ ...event, batchId })));
    }
    return events;
  }

  async getAllBatches() {
    return Array.from(this.mockLedger.keys());
  }
}

const blockchainService = new BlockchainService();

const initializeBlockchain = async () => {
  await blockchainService.initializeBlockchain();
};

module.exports = {
  blockchainService,
  initializeBlockchain
};

// routes/transactions.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const { blockchainService } = require('../services/blockchainService');
const { logAuditEvent } = require('../services/auditService');
const { validateGPSLocation } = require('../services/gpsService');
const { storeFile } = require('../services/fileService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// POST /api/collection-event - Submit new harvest data (COLLECTOR role)
router.post('/collection-event', 
  authenticate, 
  authorize(['COLLECTOR']), 
  upload.array('photos', 5),
  async (req, res) => {
    try {
      const {
        batchId,
        productType,
        quantity,
        unit,
        latitude,
        longitude,
        harvestDate,
        weatherConditions,
        soilConditions,
        organicCertified
      } = req.body;

      // Validation
      if (!batchId || !productType || !quantity || !latitude || !longitude) {
        return res.status(400).json({
          message: 'Required fields: batchId, productType, quantity, latitude, longitude'
        });
      }

      // Validate GPS location within geofence
      const isValidLocation = await validateGPSLocation(parseFloat(latitude), parseFloat(longitude));
      if (!isValidLocation) {
        return res.status(400).json({
          message: 'Collection location is outside approved geofence areas'
        });
      }

      // Process uploaded photos
      const photoFiles = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const storedFile = await storeFile(file, req.user.userId, 'collection_photo');
          photoFiles.push(storedFile.filename);
        }
      }

      // Prepare collection data
      const collectionData = {
        collectorId: req.user.username,
        productType,
        quantity: parseFloat(quantity),
        unit: unit || 'kg',
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        harvestDate: harvestDate || new Date().toISOString(),
        weatherConditions,
        soilConditions,
        organicCertified: organicCertified === 'true',
        photos: photoFiles
      };

      // Submit to blockchain
      const result = await blockchainService.submitTransaction(
        'CreateCollectionEvent',
        { batchId, collectionData },
        req.user.userId
      );

      // Log audit event
      await logAuditEvent({
        userId: req.user.userId,
        action: 'COLLECTION_EVENT_CREATED',
        resource: 'collection_event',
        resourceId: result.result.eventId,
        details: { batchId, productType, quantity },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Collection event recorded successfully',
        eventId: result.result.eventId,
        batchId,
        transactionId: result.transactionId
      });

    } catch (error) {
      console.error('Collection event error:', error);
      res.status(500).json({
        message: 'Failed to record collection event',
        error: error.message
      });
    }
  }
);

// POST /api/quality-test - Submit lab test results (LAB role)
router.post('/quality-test',
  authenticate,
  authorize(['LAB']),
  upload.single('certificate'),
  async (req, res) => {
    try {
      const {
        batchId,
        testParameters,
        testResults,
        passed,
        testDate,
        methodology,
        equipment
      } = req.body;

      // Validation
      if (!batchId || !testParameters || !testResults) {
        return res.status(400).json({
          message: 'Required fields: batchId, testParameters, testResults'
        });
      }

      // Process certificate upload
      let certificateHash = null;
      if (req.file) {
        const storedFile = await storeFile(req.file, req.user.userId, 'quality_certificate');
        certificateHash = storedFile.fileHash;
      }

      // Prepare test data
      const testData = {
        labId: req.user.username,
        parameters: JSON.parse(testParameters),
        results: JSON.parse(testResults),
        passed: passed === 'true',
        testDate: testDate || new Date().toISOString(),
        methodology,
        equipment,
        certificateHash
      };

      // Submit to blockchain
      const result = await blockchainService.submitTransaction(
        'CreateQualityTest',
        { batchId, testData },
        req.user.userId
      );

      // Log audit event
      await logAuditEvent({
        userId: req.user.userId,
        action: 'QUALITY_TEST_CREATED',
        resource: 'quality_test',
        resourceId: result.result.testId,
        details: { batchId, passed },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Quality test recorded successfully',
        testId: result.result.testId,
        batchId,
        transactionId: result.transactionId
      });

    } catch (error) {
      console.error('Quality test error:', error);
      res.status(500).json({
        message: 'Failed to record quality test',
        error: error.message
      });
    }
  }
);

// POST /api/processing-step - Record processing activities (PROCESSOR role)
router.post('/processing-step',
  authenticate,
  authorize(['PROCESSOR']),
  async (req, res) => {
    try {
      const {
        batchId,
        processType,
        inputQuantity,
        outputQuantity,
        processConditions,
        equipment,
        duration,
        processDate
      } = req.body;

      // Validation
      if (!batchId || !processType || !inputQuantity || !outputQuantity) {
        return res.status(400).json({
          message: 'Required fields: batchId, processType, inputQuantity, outputQuantity'
        });
      }

      // Prepare processing data
      const processingData = {
        processorId: req.user.username,
        processType,
        inputQuantity: parseFloat(inputQuantity),
        outputQuantity: parseFloat(outputQuantity),
        conditions: processConditions ? JSON.parse(processConditions) : {},
        equipment,
        duration,
        processDate: processDate || new Date().toISOString()
      };

      // Submit to blockchain
      const result = await blockchainService.submitTransaction(
        'CreateProcessingStep',
        { batchId, processingData },
        req.user.userId
      );

      // Log audit event
      await logAuditEvent({
        userId: req.user.userId,
        action: 'PROCESSING_STEP_CREATED',
        resource: 'processing_step',
        resourceId: result.result.stepId,
        details: { batchId, processType },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Processing step recorded successfully',
        stepId: result.result.stepId,
        batchId,
        transactionId: result.transactionId
      });

    } catch (error) {
      console.error('Processing step error:', error);
      res.status(500).json({
        message: 'Failed to record processing step',
        error: error.message
      });
    }
  }
);

// POST /api/product-batch - Create final product batch (MANUFACTURER role)
router.post('/product-batch',
  authenticate,
  authorize(['MANUFACTURER']),
  async (req, res) => {
    try {
      const {
        batchId,
        finalQuantity,
        packaging,
        expiryDate,
        batchNumber,
        distributionChannels
      } = req.body;

      // Validation
      if (!batchId || !finalQuantity || !packaging || !expiryDate) {
        return res.status(400).json({
          message: 'Required fields: batchId, finalQuantity, packaging, expiryDate'
        });
      }

      // Generate QR codes for individual products
      const qrCodes = [];
      const quantity = parseInt(finalQuantity);
      for (let i = 1; i <= Math.min(quantity, 100); i++) {
        qrCodes.push(`QR-${batchId}-${String(i).padStart(3, '0')}`);
      }

      // Prepare product data
      const productData = {
        manufacturerId: req.user.username,
        finalQuantity: parseFloat(finalQuantity),
        packaging,
        expiryDate,
        batchNumber: batchNumber || batchId,
        distributionChannels: distributionChannels ? distributionChannels.split(',') : [],
        qrCodes
      };

      // Submit to blockchain
      const result = await blockchainService.submitTransaction(
        'CreateProductBatch',
        { batchId, productData },
        req.user.userId
      );

      // Log audit event
      await logAuditEvent({
        userId: req.user.userId,
        action: 'PRODUCT_BATCH_CREATED',
        resource: 'product_batch',
        resourceId: batchId,
        details: { finalQuantity, packaging },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Product batch created successfully',
        batchId,
        qrCodes,
        transactionId: result.transactionId
      });

    } catch (error) {
      console.error('Product batch error:', error);
      res.status(500).json({
        message: 'Failed to create product batch',
        error: error.message
      });
    }
  }
);

module.exports = router;