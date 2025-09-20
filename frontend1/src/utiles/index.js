// Export all utilities
export { default as api } from './api';
export { apiService, mockData, API_ENDPOINTS } from './api';

export { default as contractService } from './contracts';
export { 
  CONTRACT_ADDRESSES, 
  CONTRACT_ABIS, 
  ROLES, 
  BATCH_STATES, 
  BATCH_STATE_LABELS,
  getAttestationTypedData 
} from './contracts';

export { default as web3Service } from './web3';

// Helper functions
export const helpers = {
  // Format date
  formatDate: (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Format number with commas
  formatNumber: (number) => {
    return new Intl.NumberFormat('en-IN').format(number);
  },

  // Generate random ID
  generateId: (length = 12) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Validate email
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate Ethereum address
  validateEthAddress: (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
};

// Constants
export const constants = {
  SUPPORTED_CHAINS: {
    1: 'Ethereum Mainnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    56: 'Binance Smart Chain'
  },
  DEFAULT_CHAIN: 137, // Polygon
  GAS_LIMITS: {
    BATCH_CREATION: 500000,
    QUALITY_TEST: 300000,
    AGGREGATION: 400000
  },
  IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
};

export default {
  api: apiService,
  contracts: contractService,
  web3: web3Service,
  helpers,
  constants
};