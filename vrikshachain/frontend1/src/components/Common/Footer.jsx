import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-leaf">🌿</span>
              <h3>VrikshaChain</h3>
            </div>
            <p className="footer-description">
              Blockchain-powered traceability for Ayurvedic herbs, ensuring authenticity, 
              quality, and sustainability from farm to formulation.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link">📘</a>
              <a href="#" className="social-link">📷</a>
              <a href="#" className="social-link">🐦</a>
              <a href="#" className="social-link">💼</a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/scan">Scan QR</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul className="footer-links">
              <li><a href="#">Documentation</a></li>
              <li><a href="#">API</a></li>
              <li><a href="#">Blockchain Explorer</a></li>
              <li><a href="#">Sustainability Report</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact Info</h4>
            <div className="contact-info">
              <p>📍 123 Ayurveda Lane, Herbal District</p>
              <p>📞 +91 98765 43210</p>
              <p>✉️ info@vrikshachain.com</p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; 2023 VrikshaChain. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>

        <div className="footer-herbs">
          <div className="floating-herb">🌿</div>
          <div className="floating-herb">🌿</div>
          <div className="floating-herb">🌿</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;