import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-background">
        <div className="floating-herbs">
          <div className="herb ashwagandha">🌿</div>
          <div className="herb tulsi">🌿</div>
          <div className="herb turmeric">🌿</div>
          <div className="herb neem">🌿</div>
        </div>
      </div>
      
      <div className="hero-content">
        <div className="hero-text">
          <h2 className="hero-title">
            Blockchain-Powered
            <span className="title-highlight"> Ayurvedic Herb</span>
            Traceability
          </h2>
          <p className="hero-description">
            From farm to formulation, experience complete transparency in your Ayurvedic journey. 
            Our blockchain technology ensures authenticity, quality, and sustainability of every herb.
          </p>
          <div className="hero-buttons">
            <a href="/scan" className="btn-primary">Track a Product</a>
            <a href="/about" className="btn-secondary">Learn More</a>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="earth-container">
            <div className="earth-sphere">
              <div className="earth-texture"></div>
              <div className="earth-glow"></div>
            </div>
            <div className="orbit-ring">
              <div className="floating-orb">🌿</div>
            </div>
          </div>
          <div className="scan-preview">
            <div className="qr-code"></div>
            <p>Scan to verify authenticity</p>
          </div>
        </div>
      </div>
      
      <div className="scroll-indicator">
        <div className="scroll-line"></div>
      </div>
    </section>
  );
};

export default Hero;