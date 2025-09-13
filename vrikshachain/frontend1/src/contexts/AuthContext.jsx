import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { contracts, account } = useWeb3();

  // Mock user data - replace with actual authentication logic
  const mockUsers = {
    farmer: {
      id: 'farmer_001',
      name: 'Rajesh Kumar',
      email: 'rajesh@organicfarms.com',
      role: 'farmer',
      walletAddress: '0x742d35Cc6634C893292...',
      farmLocation: 'Maharashtra, India'
    },
    lab: {
      id: 'lab_001',
      name: 'Dr. Priya Sharma',
      email: 'priya@ayulabs.com',
      role: 'lab',
      walletAddress: '0x893292Cc6634C742d35...',
      labName: 'Ayurvedic Quality Lab'
    },
    manager: {
      id: 'manager_001',
      name: 'Amit Patel',
      email: 'amit@vrikshachain.com',
      role: 'manager',
      walletAddress: '0x6634C893292Cc742d35...',
      department: 'Supply Chain Management'
    }
  };

  // Check blockchain role from smart contract
  const checkBlockchainRole = async (address) => {
    try {
      if (!contracts.accessRegistry) return null;
      
      // Check each role using the blockchain
      const FARMER_ROLE = await contracts.accessRegistry.FARMER_ROLE();
      const LAB_ROLE = await contracts.accessRegistry.LAB_ROLE();
      const MANAGER_ROLE = await contracts.accessRegistry.MANAGER_ROLE();
      
      if (await contracts.accessRegistry.hasRole(FARMER_ROLE, address)) {
        return 'farmer';
      } else if (await contracts.accessRegistry.hasRole(LAB_ROLE, address)) {
        return 'lab';
      } else if (await contracts.accessRegistry.hasRole(MANAGER_ROLE, address)) {
        return 'manager';
      }
      
      return null;
    } catch (error) {
      console.error('Error checking blockchain role:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check if user was previously logged in (localStorage, cookies, etc.)
    const savedUser = localStorage.getItem('vriksha_user');
    const savedRole = localStorage.getItem('vriksha_role');
    
    if (savedUser && savedRole) {
      setCurrentUser(JSON.parse(savedUser));
      setUserRole(savedRole);
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if wallet is connected
      if (!account) {
        throw new Error('Please connect your wallet first');
      }
      
      // Check blockchain role
      const blockchainRole = await checkBlockchainRole(account);
      
      if (!blockchainRole) {
        throw new Error('No blockchain role assigned to this account');
      }
      
      if (role && blockchainRole !== role) {
        throw new Error(`Your wallet has the ${blockchainRole} role, but you're trying to login as ${role}`);
      }
      
      // Mock authentication - in real app, verify credentials with backend
      let user = null;
      
      if (blockchainRole === 'farmer') {
        user = mockUsers.farmer;
      } else if (blockchainRole === 'lab') {
        user = mockUsers.lab;
      } else if (blockchainRole === 'manager') {
        user = mockUsers.manager;
      } else {
        throw new Error('Invalid role');
      }

      setCurrentUser(user);
      setUserRole(blockchainRole);
      setIsAuthenticated(true);
      
      // Save to localStorage (in real app, use secure storage)
      localStorage.setItem('vriksha_user', JSON.stringify(user));
      localStorage.setItem('vriksha_role', blockchainRole);
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    
    // Clear storage
    localStorage.removeItem('vriksha_user');
    localStorage.removeItem('vriksha_role');
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual registration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock registration - in real app, create user in database
      const newUser = {
        id: `user_${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString()
      };
      
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      
      // Update localStorage
      localStorage.setItem('vriksha_user', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (requiredRole) => {
    return userRole === requiredRole;
  };

  const hasAnyRole = (requiredRoles) => {
    return requiredRoles.includes(userRole);
  };

  const value = {
    currentUser,
    userRole,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    updateProfile,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}