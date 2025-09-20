// src/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import { AppProvider } from './contexts/AppContext';
import { RoleProvider } from './contexts/RoleContext'; // <- must import
import AppRoutes from './AppRoutes';
import './App.css';

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <AppProvider>
          <RoleProvider>
          <Router>
            <div className="App">
              {/* WalletConnect removed from here; it's embedded inside AdminLayout */}
              <AppRoutes />
            </div>
          </Router>
          </RoleProvider>
        </AppProvider>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;
