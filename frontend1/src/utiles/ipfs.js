import { create } from 'ipfs-http-client';

// IPFS configuration
const IPFS_CONFIG = {
  host: process.env.REACT_APP_IPFS_HOST || 'ipfs.infura.io',
  port: process.env.REACT_APP_IPFS_PORT || 5001,
  protocol: process.env.REACT_APP_IPFS_PROTOCOL || 'https',
  apiKey: process.env.REACT_APP_IPFS_API_KEY,
  apiSecret: process.env.REACT_APP_IPFS_API_SECRET
};

class IPFSService {
  constructor() {
    this.client = null;
    this.init();
  }

  init() {
    try {
      const auth = `Basic ${btoa(`${IPFS_CONFIG.apiKey}:${IPFS_CONFIG.apiSecret}`)}`;
      
      this.client = create({
        host: IPFS_CONFIG.host,
        port: IPFS_CONFIG.port,
        protocol: IPFS_CONFIG.protocol,
        headers: {
          authorization: auth
        }
      });
    } catch (error) {
      console.error('IPFS initialization failed:', error);
    }
  }

  // Upload data to IPFS
  async uploadData(data) {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const result = await this.client.add(JSON.stringify(data));
      return result.path;
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw error;
    }
  }

  // Upload file to IPFS
  async uploadFile(file) {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const result = await this.client.add(file);
      return result.path;
    } catch (error) {
      console.error('IPFS file upload failed:', error);
      throw error;
    }
  }

  // Get data from IPFS
  async getData(cid) {
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch IPFS data');
      }
      return await response.json();
    } catch (error) {
      console.error('IPFS data fetch failed:', error);
      throw error;
    }
  }

  // Get IPFS gateway URL
  getGatewayUrl(cid) {
    return `https://ipfs.io/ipfs/${cid}`;
  }

  // Validate CID
  isValidCID(cid) {
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid) || 
           /^bafy[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
  }
}

// Create singleton instance
const ipfsService = new IPFSService();

export default ipfsService;