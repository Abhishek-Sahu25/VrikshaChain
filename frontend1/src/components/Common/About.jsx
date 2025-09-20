import React from 'react';
import './About.css';

const About = () => {
  return (
    <section id="about" className="about">
      <div className="about-container">
        <div className="about-content">
          <h2 className="about-title">About VrikshaChain</h2>
          <p className="about-description">
            VrikshaChain leverages blockchain technology to bring unprecedented transparency 
            and trust to the Ayurvedic herb supply chain. From the moment a herb is harvested 
            to when it reaches your hands, every step is recorded immutably on the blockchain.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🌿</div>
              <h3>Geo-Tagged Harvesting</h3>
              <p>Every herb is GPS-tagged at source, ensuring authentic origin and sustainable harvesting practices.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Quality Verification</h3>
              <p>Laboratory test results are permanently recorded on blockchain, guaranteeing purity and potency.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Supply Chain Transparency</h3>
              <p>Track every step of your herb's journey from farm to formulation with complete visibility.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>Sustainability Focus</h3>
              <p>Support ethical harvesting and contribute to the preservation of medicinal plant biodiversity.</p>
            </div>
          </div>
        </div>
        
        <div className="about-visual">
          <div className="blockchain-animation">
            <div className="block-node"></div>
            <div className="block-connector"></div>
            <div className="block-node"></div>
            <div className="block-connector"></div>
            <div className="block-node"></div>
            <div className="block-connector"></div>
            <div className="block-node"></div>
          </div>
          <div className="visual-label">Immutable Blockchain Record</div>
        </div>
      </div>
    </section>
  );
};

export default About;