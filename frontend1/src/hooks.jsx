import { useWeb3 } from './contexts/Web3Context';
import { useAuth } from './contexts/AuthContext';
import { useApp } from './contexts/AppContext';

// Hook for checking user permissions
export const usePermissions = () => {
  const { userRole } = useAuth();
  const { contracts } = useWeb3();

  const canCreateBatch = userRole === 'farmer';
  const canTestQuality = userRole === 'lab';
  const canManageSupplyChain = userRole === 'manager';

  const hasContractAccess = async (contractName) => {
    if (!contracts[contractName] || !userRole) return false;
    
    try {
      // Check if user has required role for contract access
      // This would require specific contract functions to check permissions
      return true;
    } catch (error) {
      console.error('Error checking contract access:', error);
      return false;
    }
  };

  return {
    canCreateBatch,
    canTestQuality,
    canManageSupplyChain,
    hasContractAccess
  };
};

// Hook for blockchain operations
export const useBlockchain = () => {
  const { contracts, signer, account } = useWeb3();
  const { showNotification } = useApp();

  const createBatch = async (batchData) => {
    try {
      if (!contracts.batchToken) {
        throw new Error('Batch token contract not available');
      }

      // For demo purposes, we'll simulate the transaction
      console.log('Creating batch with data:', batchData);
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful transaction
      const mockTransactionHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      showNotification({
        type: 'success',
        title: 'Batch Created',
        message: 'Batch successfully created on blockchain'
      });

      return { success: true, transactionHash: mockTransactionHash };
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.message
      });
      return { success: false, error: error.message };
    }
  };

  const verifyQuality = async (testData) => {
    try {
      if (!contracts.attestationVerifier) {
        throw new Error('Attestation verifier contract not available');
      }

      // For demo purposes, we'll simulate the transaction
      console.log('Verifying quality with data:', testData);
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful transaction
      const mockTransactionHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      showNotification({
        type: 'success',
        title: 'Quality Verified',
        message: 'Quality test results verified on blockchain'
      });

      return { success: true, transactionHash: mockTransactionHash };
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Verification Failed',
        message: error.message
      });
      return { success: false, error: error.message };
    }
  };

  return {
    createBatch,
    verifyQuality
  };
};