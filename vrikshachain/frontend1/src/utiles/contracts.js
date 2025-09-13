import { ethers } from 'ethers';

// Contract addresses (replace with your deployed addresses)
export const CONTRACT_ADDRESSES = {
  accessRegistry: process.env.REACT_APP_ACCESS_REGISTRY_ADDRESS || '0x742d35Cc6634C893292...',
  batchToken: process.env.REACT_APP_BATCH_TOKEN_ADDRESS || '0x893292Cc6634C742d35...',
  aggregationManager: process.env.REACT_APP_AGGREGATION_MANAGER_ADDRESS || '0x6634C893292Cc742d35...',
  attestationVerifier: process.env.REACT_APP_ATTESTATION_VERIFIER_ADDRESS || '0xCc6634C893292742d35...',
  sustainabilityTracker: process.env.REACT_APP_SUSTAINABILITY_TRACKER_ADDRESS || '0x292Cc6634C893742d35...'
};

// Contract ABIs (simplified - replace with your actual ABIs)
export const CONTRACT_ABIS = {
  accessRegistry: [
    'function hasRole(bytes32 role, address account) external view returns (bool)',
    'function getRoleAdmin(bytes32 role) external view returns (bytes32)',
    'function grantRole(bytes32 role, address account) external',
    'function revokeRole(bytes32 role, address account) external',
    'function renounceRole(bytes32 role, address account) external',
    'function FARMER_ROLE() external view returns (bytes32)',
    'function LAB_ROLE() external view returns (bytes32)',
    'function MANAGER_ROLE() external view returns (bytes32)',
    'function ADMIN_ROLE() external view returns (bytes32)',
    'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)'
  ],

  batchToken: [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
    'function mintWithAttestation(address to, string calldata cid, string calldata species, uint256 weight, uint256 collectedAt, bytes32 locationHash, address farmer, uint256 nonce, bytes calldata signature) external returns (uint256)',
    'function adminMintParent(address to, string calldata cid, bytes32 locationHash) external returns (uint256)',
    'function setParent(uint256 childId, uint256 parentId) external',
    'function updateMetadataCID(uint256 tokenId, string calldata newCid) external',
    'function changeState(uint256 tokenId, uint8 newState) external',
    'function batches(uint256) external view returns (uint256 id, string memory metadataCID, bytes32 locationHash, uint256 timestamp, uint256 parentId, uint8 state)',
    'function tokenURI(uint256 tokenId) external view returns (string memory)',
    'event BatchMinted(uint256 indexed tokenId, address indexed owner, string cid, bytes32 locationHash, uint256 timestamp, address farmer)',
    'event MetadataUpdated(uint256 indexed tokenId, string newCid)',
    'event BatchStateChanged(uint256 indexed tokenId, uint8 newState)',
    'event ParentAssigned(uint256 indexed childId, uint256 indexed parentId)'
  ],

  aggregationManager: [
    'function aggregate(address to, string calldata parentCid, bytes32 parentLocationHash, uint256[] calldata children) external returns (uint256)',
    'function getBatchChildren(uint256 parentId) external view returns (uint256[] memory)',
    'function getBatchParent(uint256 childId) external view returns (uint256)',
    'event Aggregated(uint256 indexed parentId, uint256[] children, address indexed aggregator, uint256 timestamp)'
  ],

  attestationVerifier: [
    'function verify(string calldata cid, string calldata species, uint256 weight, uint256 collectedAt, address farmer, uint256 nonce, bytes calldata signature) external returns (address)',
    'function getNonce(address farmer, uint256 nonce) external view returns (bool)',
    'function resetNonce(address farmer, uint256 nonce) external',
    'function BATCH_TYPEHASH() external view returns (bytes32)',
    'event NonceUsed(address indexed farmer, uint256 nonce)',
    'event AttestationVerified(address indexed farmer, address indexed verifier, uint256 timestamp)'
  ],

  sustainabilityTracker: [
    'function recordCarbonFootprint(uint256 batchId, uint256 carbonAmount) external',
    'function recordWaterUsage(uint256 batchId, uint256 waterAmount) external',
    'function recordEnergyUsage(uint256 batchId, uint256 energyAmount) external',
    'function getSustainabilityScore(uint256 batchId) external view returns (uint256)',
    'function getCarbonFootprint(uint256 batchId) external view returns (uint256)',
    'function getWaterUsage(uint256 batchId) external view returns (uint256)',
    'function getEnergyUsage(uint256 batchId) external view returns (uint256)',
    'event SustainabilityRecorded(uint256 indexed batchId, address indexed recorder, uint256 timestamp)',
    'event CarbonFootprintRecorded(uint256 indexed batchId, uint256 amount)',
    'event WaterUsageRecorded(uint256 indexed batchId, uint256 amount)',
    'event EnergyUsageRecorded(uint256 indexed batchId, uint256 amount)'
  ]
};

// Role constants
export const ROLES = {
  FARMER_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('FARMER_ROLE')),
  LAB_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('LAB_ROLE')),
  MANAGER_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MANAGER_ROLE')),
  ADMIN_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'))
};

// Batch states
export const BATCH_STATES = {
  CREATED: 0,
  COLLECTED: 1,
  TESTING: 2,
  PROCESSING: 3,
  PACKAGING: 4,
  IN_TRANSIT: 5,
  DELIVERED: 6,
  COMPLETED: 7,
  REJECTED: 8
};

export const BATCH_STATE_LABELS = {
  0: 'Created',
  1: 'Collected',
  2: 'Testing',
  3: 'Processing',
  4: 'Packaging',
  5: 'In Transit',
  6: 'Delivered',
  7: 'Completed',
  8: 'Rejected'
};

// Contract helper functions
export const contractService = {
  // Initialize contracts
  initializeContracts: async (signer) => {
    const contracts = {};
    
    for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
      if (address && CONTRACT_ABIS[name]) {
        contracts[name] = new ethers.Contract(address, CONTRACT_ABIS[name], signer);
      }
    }
    
    return contracts;
  },

  // Check role permissions
  checkRole: async (contract, account, role) => {
    try {
      return await contract.hasRole(role, account);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  },

  // Create batch with attestation
  createBatchWithAttestation: async (batchTokenContract, batchData) => {
    const {
      to,
      cid,
      species,
      weight,
      collectedAt,
      locationHash,
      farmer,
      nonce,
      signature
    } = batchData;

    try {
      const tx = await batchTokenContract.mintWithAttestation(
        to,
        cid,
        species,
        weight,
        collectedAt,
        locationHash,
        farmer,
        nonce,
        signature
      );

      const receipt = await tx.wait();
      return { success: true, transactionHash: tx.hash, receipt };
    } catch (error) {
      console.error('Error creating batch:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify attestation
  verifyAttestation: async (verifierContract, attestationData) => {
    const {
      cid,
      species,
      weight,
      collectedAt,
      farmer,
      nonce,
      signature
    } = attestationData;

    try {
      const signer = await verifierContract.verify(
        cid,
        species,
        weight,
        collectedAt,
        farmer,
        nonce,
        signature
      );

      return { success: true, signer };
    } catch (error) {
      console.error('Error verifying attestation:', error);
      return { success: false, error: error.message };
    }
  },

  // Aggregate batches
  aggregateBatches: async (aggregationContract, aggregationData) => {
    const {
      to,
      parentCid,
      parentLocationHash,
      children
    } = aggregationData;

    try {
      const tx = await aggregationContract.aggregate(
        to,
        parentCid,
        parentLocationHash,
        children
      );

      const receipt = await tx.wait();
      return { success: true, transactionHash: tx.hash, receipt };
    } catch (error) {
      console.error('Error aggregating batches:', error);
      return { success: false, error: error.message };
    }
  },

  // Get batch information
  getBatchInfo: async (batchTokenContract, tokenId) => {
    try {
      const batch = await batchTokenContract.batches(tokenId);
      return {
        id: batch.id.toString(),
        metadataCID: batch.metadataCID,
        locationHash: batch.locationHash,
        timestamp: new Date(batch.timestamp.toNumber() * 1000),
        parentId: batch.parentId.toString(),
        state: batch.state
      };
    } catch (error) {
      console.error('Error getting batch info:', error);
      return null;
    }
  },

  // Record sustainability metrics
  recordSustainability: async (sustainabilityContract, recordData) => {
    const {
      batchId,
      carbonAmount,
      waterAmount,
      energyAmount
    } = recordData;

    try {
      const tx = await sustainabilityContract.recordCarbonFootprint(batchId, carbonAmount);
      await tx.wait();

      if (waterAmount) {
        const waterTx = await sustainabilityContract.recordWaterUsage(batchId, waterAmount);
        await waterTx.wait();
      }

      if (energyAmount) {
        const energyTx = await sustainabilityContract.recordEnergyUsage(batchId, energyAmount);
        await energyTx.wait();
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording sustainability:', error);
      return { success: false, error: error.message };
    }
  }
};

// EIP-712 typed data for attestations
export const getAttestationTypedData = (domain, message) => {
  return {
    types: {
      BatchAttestation: [
        { name: 'cid', type: 'string' },
        { name: 'species', type: 'string' },
        { name: 'weight', type: 'uint256' },
        { name: 'collectedAt', type: 'uint256' },
        { name: 'farmer', type: 'address' },
        { name: 'nonce', type: 'uint256' }
      ]
    },
    domain,
    message
  };
};

export default contractService;