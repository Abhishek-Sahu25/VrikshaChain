import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, userRole, logout } = useAuth();
  const { account, connectWeb3, disconnect } = useWeb3();

  const handleWalletConnect = async () => {
    if (account) {
      disconnect();
    } else {
      await connectWeb3();
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <div className="logo-3d">
            <span className="logo-leaf">🌿</span>
            <h1>VrikshaChain</h1>
          </div>
        </div>
        
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <a href="/" className="nav-link">Home</a>
          <a href="/about" className="nav-link">About</a>
          <a href="/scan" className="nav-link">Scan QR</a>
          <a href="/contact" className="nav-link">Contact</a>
          
          {isAuthenticated ? (
            <>
              <a href="/admin" className="nav-link">Dashboard</a>
              <button className="nav-button" onClick={logout}>
                Logout ({userRole})
              </button>
            </>
          ) : null}
        </nav>
        
        <div className="wallet-section">
          <button 
            className={`wallet-btn ${account ? 'connected' : ''}`}
            onClick={handleWalletConnect}
          >
            {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>

        <button 
          className="menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
};

export default Header;