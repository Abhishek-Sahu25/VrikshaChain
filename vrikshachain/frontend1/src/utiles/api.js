import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  
  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id) => `/products/${id}`,
  PRODUCT_BY_BATCH: (batchId) => `/products/batch/${batchId}`,
  SEARCH_PRODUCTS: '/products/search',
  
  // Batches
  BATCHES: '/batches',
  BATCH_BY_ID: (id) => `/batches/${id}`,
  BATCH_TRACKING: (batchId) => `/batches/${batchId}/tracking`,
  
  // Collections
  COLLECTIONS: '/collections',
  COLLECTION_BY_ID: (id) => `/collections/${id}`,
  FARMER_COLLECTIONS: (farmerId) => `/collections/farmer/${farmerId}`,
  
  // Quality Tests
  QUALITY_TESTS: '/quality-tests',
  QUALITY_TEST_BY_ID: (id) => `/quality-tests/${id}`,
  BATCH_QUALITY_TESTS: (batchId) => `/quality-tests/batch/${batchId}`,
  
  // Sustainability
  SUSTAINABILITY_REPORTS: '/sustainability-reports',
  REPORT_BY_ID: (id) => `/sustainability-reports/${id}`,
  CARBON_FOOTPRINT: '/sustainability/carbon-footprint',
  
  // Blockchain
  BLOCKCHAIN_TRANSACTIONS: '/blockchain/transactions',
  TRANSACTION_BY_HASH: (hash) => `/blockchain/transactions/${hash}`,
  VERIFY_BLOCKCHAIN: '/blockchain/verify',
  
  // Analytics
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_SUPPLY_CHAIN: '/analytics/supply-chain',
  ANALYTICS_QUALITY: '/analytics/quality-metrics',
};

// API functions
export const apiService = {
  // Authentication
  login: async (credentials) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post(API_ENDPOINTS.REGISTER, userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post(API_ENDPOINTS.LOGOUT);
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post(API_ENDPOINTS.REFRESH_TOKEN);
    return response.data;
  },

  // Products
  getProducts: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.PRODUCTS, { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(API_ENDPOINTS.PRODUCT_BY_ID(id));
    return response.data;
  },

  getProductByBatch: async (batchId) => {
    const response = await api.get(API_ENDPOINTS.PRODUCT_BY_BATCH(batchId));
    return response.data;
  },

  searchProducts: async (query) => {
    const response = await api.get(API_ENDPOINTS.SEARCH_PRODUCTS, {
      params: { q: query }
    });
    return response.data;
  },

  // Batches
  getBatches: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.BATCHES, { params });
    return response.data;
  },

  getBatchById: async (id) => {
    const response = await api.get(API_ENDPOINTS.BATCH_BY_ID(id));
    return response.data;
  },

  getBatchTracking: async (batchId) => {
    const response = await api.get(API_ENDPOINTS.BATCH_TRACKING(batchId));
    return response.data;
  },

  createBatch: async (batchData) => {
    const response = await api.post(API_ENDPOINTS.BATCHES, batchData);
    return response.data;
  },

  // Collections
  getCollections: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.COLLECTIONS, { params });
    return response.data;
  },

  getCollectionById: async (id) => {
    const response = await api.get(API_ENDPOINTS.COLLECTION_BY_ID(id));
    return response.data;
  },

  getFarmerCollections: async (farmerId) => {
    const response = await api.get(API_ENDPOINTS.FARMER_COLLECTIONS(farmerId));
    return response.data;
  },

  createCollection: async (collectionData) => {
    const response = await api.post(API_ENDPOINTS.COLLECTIONS, collectionData);
    return response.data;
  },

  // Quality Tests
  getQualityTests: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.QUALITY_TESTS, { params });
    return response.data;
  },

  getQualityTestById: async (id) => {
    const response = await api.get(API_ENDPOINTS.QUALITY_TEST_BY_ID(id));
    return response.data;
  },

  getBatchQualityTests: async (batchId) => {
    const response = await api.get(API_ENDPOINTS.BATCH_QUALITY_TESTS(batchId));
    return response.data;
  },

  createQualityTest: async (testData) => {
    const response = await api.post(API_ENDPOINTS.QUALITY_TESTS, testData);
    return response.data;
  },

  // Sustainability
  getSustainabilityReports: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.SUSTAINABILITY_REPORTS, { params });
    return response.data;
  },

  getReportById: async (id) => {
    const response = await api.get(API_ENDPOINTS.REPORT_BY_ID(id));
    return response.data;
  },

  getCarbonFootprint: async () => {
    const response = await api.get(API_ENDPOINTS.CARBON_FOOTPRINT);
    return response.data;
  },

  // Blockchain
  getBlockchainTransactions: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.BLOCKCHAIN_TRANSACTIONS, { params });
    return response.data;
  },

  getTransactionByHash: async (hash) => {
    const response = await api.get(API_ENDPOINTS.TRANSACTION_BY_HASH(hash));
    return response.data;
  },

  verifyBlockchain: async (verificationData) => {
    const response = await api.post(API_ENDPOINTS.VERIFY_BLOCKCHAIN, verificationData);
    return response.data;
  },

  // Analytics
  getAnalyticsOverview: async () => {
    const response = await api.get(API_ENDPOINTS.ANALYTICS_OVERVIEW);
    return response.data;
  },

  getSupplyChainAnalytics: async () => {
    const response = await api.get(API_ENDPOINTS.ANALYTICS_SUPPLY_CHAIN);
    return response.data;
  },

  getQualityAnalytics: async () => {
    const response = await api.get(API_ENDPOINTS.ANALYTICS_QUALITY);
    return response.data;
  },
};

// Mock data for development (remove in production)
export const mockData = {
  products: [
    {
      id: 'ASH-2023-0012',
      name: 'Organic Ashwagandha Root Powder',
      species: 'Withania somnifera',
      description: 'Premium quality Ashwagandha root powder harvested from organic farms',
      batchInfo: {
        harvestDate: '2023-06-15',
        expiryDate: '2025-06-15',
        weight: '200g',
        origin: 'Maharashtra, India'
      },
      sustainability: {
        score: 95,
        carbonFootprint: '12.4 kg CO₂',
        waterSaved: '45,000 liters'
      }
    }
  ],
  batches: [
    {
      id: 'BATCH-001',
      productId: 'ASH-2023-0012',
      status: 'in-transit',
      currentLocation: 'Distribution Center, Delhi',
      timeline: [
        { step: 'Harvested', timestamp: '2023-06-15 08:30', location: 'Farm, Maharashtra' },
        { step: 'Quality Tested', timestamp: '2023-06-16 14:20', location: 'Lab, Pune' }
      ]
    }
  ]
};

export default api;