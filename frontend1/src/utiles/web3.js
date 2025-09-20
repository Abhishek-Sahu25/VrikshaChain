import { ethers } from 'ethers';
import { contractService, CONTRACT_ADDRESSES, CONTRACT_ABIS } from './contracts';

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.chainId = null;
    this.contracts = {};
    this.isConnected = false;
  }

  // Initialize Web3 connection
  async init() {
    try {
      if (!window.ethereum) {
        throw new Error('Web3 wallet not found. Please install MetaMask.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Set up provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.account = accounts[0];

      // Get network details
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;

      // Initialize contracts
      this.contracts = await contractService.initializeContracts(this.signer);

      this.isConnected = true;
      
      // Set up event listeners
      this.setupEventListeners();

      return { success: true, account: this.account, chainId: this.chainId };
    } catch (error) {
      console.error('Web3 initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Set up event listeners
  setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
      window.ethereum.on('disconnect', this.handleDisconnect.bind(this));
    }
  }

  // Handle account changes
  handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this.account = accounts[0];
      // Emit event or update state
      this.emit('accountsChanged', this.account);
    }
  }

  // Handle chain changes
  handleChainChanged(chainId) {
    this.chainId = parseInt(chainId, 16);
    window.location.reload();
  }

  // Handle disconnect
  handleDisconnect() {
    this.disconnect();
  }

  // Disconnect from Web3
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.chainId = null;
    this.contracts = {};
    this.isConnected = false;
    
    // Emit event or update state
    this.emit('disconnect');
  }

  // Switch network
  async switchNetwork(chainId = 137) { // Default to Polygon
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return { success: true };
    } catch (error) {
      if (error.code === 4902) {
        return await this.addNetwork(chainId);
      }
      return { success: false, error: error.message };
    }
  }

  // Add network to wallet
  async addNetwork(chainId) {
    const networkConfigs = {
      137: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18
        },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/']
      },
      80001: {
        chainId: '0x13881',
        chainName: 'Mumbai Testnet',
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18
        },
        rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com/']
      },
      56: {
        chainId: '0x38',
        chainName: 'Binance Smart Chain',
        nativeCurrency: {
          name: 'BNB',
          symbol: 'BNB',
          decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/']
      },
      1: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: {
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io/']
      }
    };

    const config = networkConfigs[chainId];
    if (!config) {
      return { success: false, error: `Unsupported chainId: ${chainId}` };
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [config]
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get account balance
  async getBalance(address = this.account) {
    if (!this.provider || !address) return null;
    
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return null;
    }
  }

  // Sign message
  async signMessage(message) {
    if (!this.signer) {
      throw new Error('No signer available');
    }
    
    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  // Sign typed data (EIP-712)
  async signTypedData(domain, types, value) {
    if (!this.signer) {
      throw new Error('No signer available');
    }
    
    try {
      const signature = await this.signer._signTypedData(domain, types, value);
      return signature;
    } catch (error) {
      console.error('Error signing typed data:', error);
      throw error;
    }
  }

  // Verify signature
  async verifySignature(message, signature) {
    try {
      const signerAddress = ethers.utils.verifyMessage(message, signature);
      return signerAddress;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return null;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash) {
    if (!this.provider) return null;
    
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  // Get block information
  async getBlock(blockNumber) {
    if (!this.provider) return null;
    
    try {
      return await this.provider.getBlock(blockNumber);
    } catch (error) {
      console.error('Error getting block:', error);
      return null;
    }
  }

  // Check if address is valid
  isValidAddress(address) {
    return ethers.utils.isAddress(address);
  }

  // Format address
  formatAddress(address, length = 8) {
    if (!this.isValidAddress(address)) return address;
    
    const start = address.substring(0, length + 2);
    const end = address.substring(address.length - length);
    return `${start}...${end}`;
  }

  // Convert to wei
  toWei(amount, unit = 'ether') {
    return ethers.utils.parseUnits(amount.toString(), unit);
  }

  // Convert from wei
  fromWei(amount, unit = 'ether') {
    return ethers.utils.formatUnits(amount, unit);
  }

  // Event emitter (simple implementation)
  events = {};
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
}

// Create singleton instance
const web3Service = new Web3Service();

export default web3Service;