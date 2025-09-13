import React, { useState } from 'react';
import Header from '../Common/Header';
import Footer from '../Common/Footer';
import './ConsumerLayout.css';

const ConsumerLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="consumer-layout">
      <Header />
      
      <main className="consumer-main">
        {children}
      </main>
      
      <Footer />

      {/* Quick Action Buttons */}
      <div className="quick-action-buttons">
        <button className="quick-action scan-quick">
          <span className="action-icon">📷</span>
          <span className="action-text">Scan QR</span>
        </button>
        <button className="quick-action track-quick">
          <span className="action-icon">🔍</span>
          <span className="action-text">Track</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default ConsumerLayout;