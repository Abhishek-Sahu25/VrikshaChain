import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import { AppProvider } from './contexts/AppContext';
import AppRoutes from './AppRoutes';
import './App.css';

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <AppProvider>
          <Router>
            <div className="App">
              <AppRoutes />
            </div>
          </Router>
        </AppProvider>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;