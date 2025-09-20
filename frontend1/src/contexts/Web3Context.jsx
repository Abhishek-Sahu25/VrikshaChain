import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [contracts, setContracts] = useState({});

  // Contract addresses (replace with your deployed contract addresses)
  const CONTRACT_ADDRESSES = {
    accessRegistry: import.meta.env.VITE_ACCESS_REGISTRY_ADDRESS || '0x742d35Cc6634C893292...',
    batchToken: import.meta.env.VITE_BATCH_TOKEN_ADDRESS || '0x893292Cc6634C742d35...',
    aggregationManager: import.meta.env.VITE_AGGREGATION_MANAGER_ADDRESS || '0x6634C893292Cc742d35...',
    attestationVerifier: import.meta.env.VITE_ATTESTATION_VERIFIER_ADDRESS || '0xCc6634C893292742d35...'
  };

  // Contract ABIs (simplified versions - replace with actual ABIs)
  const CONTRACT_ABIS = {
    accessRegistry: [
      'function hasRole(bytes32 role, address account) external view returns (bool)',
      'function FARMER_ROLE() external view returns (bytes32)',
      'function LAB_ROLE() external view returns (bytes32)',
      'function MANAGER_ROLE() external view returns (bytes32)'
    ],
    batchToken: [
      'function mintWithAttestation(address to, string calldata cid, string calldata species, uint256 weight, uint256 collectedAt, bytes32 locationHash, address farmer, uint256 nonce, bytes calldata signature) external returns (uint256)',
      'function ownerOf(uint256 tokenId) external view returns (address)',
      'function batches(uint256) external view returns (uint256 id, string memory metadataCID, bytes32 locationHash, uint256 timestamp, uint256 parentId, uint8 state)'
    ],
    aggregationManager: [
      'function aggregate(address to, string calldata parentCid, bytes32 parentLocationHash, uint256[] calldata children) external returns (uint256)'
    ],
    attestationVerifier: [
      'function verify(string calldata cid, string calldata species, uint256 weight, uint256 collectedAt, address farmer, uint256 nonce, bytes calldata signature) external returns (address)'
    ]
  };

  useEffect(() => {
    checkConnection();
    setupEventListeners();
  }, []);

  const setupEventListeners = () => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }
  };

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWeb3();
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWeb3 = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask or other Web3 wallet not found');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Get network details
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await web3Provider.getNetwork();

      // Set up signer
      const web3Signer = web3Provider.getSigner();
      const address = await web3Signer.getAddress();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(address);
      setChainId(network.chainId);
      setIsConnected(true);

      // Initialize contracts
      await initializeContracts(web3Signer);

      // Save connection state
      localStorage.setItem('vriksha_web3_connected', 'true');

      return { success: true, account: address, chainId: network.chainId };
    } catch (error) {
      const errorMsg = error.message || 'Failed to connect to Web3 wallet';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsConnecting(false);
    }
  };

  const initializeContracts = async (signer) => {
    try {
      const contractInstances = {};

      for (const [contractName, address] of Object.entries(CONTRACT_ADDRESSES)) {
        if (address && CONTRACT_ABIS[contractName]) {
          contractInstances[contractName] = new ethers.Contract(
            address,
            CONTRACT_ABIS[contractName],
            signer
          );
        }
      }

      setContracts(contractInstances);
    } catch (error) {
      console.error('Error initializing contracts:', error);
      setError('Failed to initialize smart contracts');
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setContracts({});
    setError(null);
    
    localStorage.removeItem('vriksha_web3_connected');
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (chainId) => {
    setChainId(parseInt(chainId, 16));
    window.location.reload();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const switchNetwork = async (chainId = 137) => { // Default to Polygon Mainnet
    try {
      if (!window.ethereum) return;

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, try to add it
        await addNetwork(chainId);
      }
      throw error;
    }
  };

  const addNetwork = async (chainId) => {
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
      }
    };

    const config = networkConfigs[chainId];
    if (!config) throw new Error(`Unsupported chainId: ${chainId}`);

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config]
    });
  };

  const getBalance = async (address = account) => {
    if (!provider || !address) return null;
    
    try {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return null;
    }
  };

  const signMessage = async (message) => {
    if (!signer) throw new Error('No signer available');
    
    try {
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  const value = {
    // State
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    contracts,
    
    // Methods
    connectWeb3,
    disconnect,
    switchNetwork,
    getBalance,
    signMessage,
    
    // Constants
    CONTRACT_ADDRESSES
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}