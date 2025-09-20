// src/utiles/contracts.js
import AccessRegistryAbi from '../abis/AccessRegistry.json';
import BatchTokenAbi from '../abis/BatchToken.json';
import AttestationVerifierAbi from '../abis/AttestationVerifier.json';
import AggregationManagerAbi from '../abis/AggregationManager.json';
import addressesJson from '../contracts/addresses.json';
import { ethers } from 'ethers';

const env = {
  ALCHEMY_URL: import.meta.env.VITE_ALCHEMY_SEPOLIA_URL,
  CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID || 11155111)
};

const CONTRACT_ADDRESSES = {
  accessRegistry: addressesJson?.AccessRegistry || import.meta.env.VITE_ACCESS_REGISTRY_ADDRESS,
  batchToken: addressesJson?.BatchToken || import.meta.env.VITE_BATCH_TOKEN_ADDRESS,
  attestationVerifier: addressesJson?.AttestationVerifier || import.meta.env.VITE_ATTESTATION_VERIFIER_ADDRESS,
  aggregationManager: addressesJson?.AggregationManager || import.meta.env.VITE_AGGREGATION_MANAGER_ADDRESS
};

let defaultProvider = null;
export function getProvider() {
  if (!defaultProvider) {
    defaultProvider = new ethers.JsonRpcProvider(env.ALCHEMY_URL);
  }
  return defaultProvider;
}

export function getSigner() {
  if (!window.ethereum) throw new Error('No wallet available');
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export function getContract(name, withSigner = false, signerOrProvider = null) {
  const addr = CONTRACT_ADDRESSES[name];
  if (!addr) throw new Error('Unknown contract name: ' + name);
  let abi;
  switch (name) {
    case 'accessRegistry': abi = AccessRegistryAbi.abi ?? AccessRegistryAbi; break;
    case 'batchToken': abi = BatchTokenAbi.abi ?? BatchTokenAbi; break;
    case 'attestationVerifier': abi = AttestationVerifierAbi.abi ?? AttestationVerifierAbi; break;
    case 'aggregationManager': abi = AggregationManagerAbi.abi ?? AggregationManagerAbi; break;
    default: throw new Error('Unsupported contract: ' + name);
  }
  const provider = signerOrProvider || (withSigner ? getSigner() : getProvider());
  return new ethers.Contract(addr, abi, provider);
}

export function initializeContractsReadOnly() {
  const provider = getProvider();
  return {
    accessRegistry: new ethers.Contract(CONTRACT_ADDRESSES.accessRegistry, AccessRegistryAbi.abi ?? AccessRegistryAbi, provider),
    batchToken: new ethers.Contract(CONTRACT_ADDRESSES.batchToken, BatchTokenAbi.abi ?? BatchTokenAbi, provider),
    attestationVerifier: new ethers.Contract(CONTRACT_ADDRESSES.attestationVerifier, AttestationVerifierAbi.abi ?? AttestationVerifierAbi, provider),
    aggregationManager: new ethers.Contract(CONTRACT_ADDRESSES.aggregationManager, AggregationManagerAbi.abi ?? AggregationManagerAbi, provider)
  };
}

export default {
  getProvider, getSigner, getContract, initializeContractsReadOnly
};
