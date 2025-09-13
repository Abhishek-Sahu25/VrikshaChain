import React, { createContext, useContext, useState, useReducer } from 'react';

const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Reducer for complex state management
function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload]
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (_, index) => index !== action.payload
        )
      };
    
    case 'SET_MODAL':
      return { ...state, modal: action.payload };
    
    case 'CLOSE_MODAL':
      return { ...state, modal: null };
    
    case 'SET_SCANNED_PRODUCT':
      return { ...state, scannedProduct: action.payload };
    
    case 'SET_PROVENANCE_DATA':
      return { ...state, provenanceData: action.payload };
    
    default:
      return state;
  }
}

const initialState = {
  loading: false,
  notifications: [],
  modal: null,
  scannedProduct: null,
  provenanceData: null,
  theme: 'light'
};

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const showNotification = (notification) => {
    const id = Date.now();
    const notificationWithId = { ...notification, id };
    
    dispatch({ type: 'SET_NOTIFICATION', payload: notificationWithId });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const showModal = (modalConfig) => {
    dispatch({ type: 'SET_MODAL', payload: modalConfig });
  };

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const setScannedProduct = (product) => {
    dispatch({ type: 'SET_SCANNED_PRODUCT', payload: product });
  };

  const setProvenanceData = (data) => {
    dispatch({ type: 'SET_PROVENANCE_DATA', payload: data });
  };

  const value = {
    // State
    ...state,
    
    // Methods
    setLoading,
    showNotification,
    removeNotification,
    showModal,
    closeModal,
    setScannedProduct,
    setProvenanceData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}