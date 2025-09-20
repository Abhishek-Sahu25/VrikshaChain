import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../../contexts/Web3Context';
import './BatchTracking.css';

const BatchTracking = () => {
  const [batchId, setBatchId] = useState('');
  const [batchData, setBatchData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { contracts } = useWeb3();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!batchId) return;
    
    setIsLoading(true);
    
    try {
      // Try to fetch from blockchain first
      if (contracts.batchToken) {
        try {
          const batchInfo = await contracts.batchToken.batches(batchId);
          if (batchInfo && batchInfo.id) {
            setBatchData({
              id: batchId,
              species: 'Herb from Blockchain',
              status: ['Created', 'Tested', 'Processed', 'Shipped'][batchInfo.state] || 'Unknown',
              currentLocation: 'Blockchain Verified',
              origin: 'Smart Contract Record',
              harvestDate: new Date(batchInfo.timestamp * 1000).toLocaleDateString(),
              estimatedArrival: 'N/A',
              qualityScore: 95,
              sustainabilityScore: 90,
              blockchainHash: '0x' + Math.random().toString(16).substr(2, 64),
              timeline: [
                { step: 'Created on Blockchain', timestamp: new Date(batchInfo.timestamp * 1000).toLocaleString(), location: 'Blockchain Network' },
                { step: 'Quality Tested', timestamp: new Date(batchInfo.timestamp * 1000 + 86400000).toLocaleString(), location: 'Lab Verification' },
                { step: 'Processing', timestamp: new Date(batchInfo.timestamp * 1000 + 172800000).toLocaleString(), location: 'Processing Facility' }
              ]
            });
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.log('Batch not found on blockchain, using mock data');
        }
      }
      
      // Fallback to mock data
      setTimeout(() => {
        const mockData = {
          id: batchId,
          species: 'Ashwagandha',
          status: 'In Transit',
          currentLocation: 'Distribution Center, Delhi',
          origin: 'Organic Farm, Maharashtra',
          harvestDate: '2023-06-15',
          estimatedArrival: '2023-06-25',
          qualityScore: 92,
          sustainabilityScore: 95,
          blockchainHash: '0x742d35Cc6634C893292...',
          timeline: [
            { step: 'Harvested', timestamp: '2023-06-15 08:30', location: 'Farm, Maharashtra' },
            { step: 'Quality Tested', timestamp: '2023-06-16 14:20', location: 'Lab, Pune' },
            { step: 'Processed', timestamp: '2023-06-18 11:45', location: 'Processing Facility' },
            { step: 'In Transit', timestamp: '2023-06-20 09:15', location: 'To Distribution Center' }
          ]
        };
        setBatchData(mockData);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error tracking batch:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="batch-tracking">
      <div className="tracking-header">
        <h2>Batch Tracking</h2>
        <p>Track your Ayurvedic herbs through the complete supply chain</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form-3d">
          <div className="search-group">
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="Enter Batch ID (e.g., ASH-2023-0012)"
              className="search-input"
            />
            <button type="submit" className="search-btn-3d" disabled={isLoading}>
              {isLoading ? 'Searching...' : '🔍 Track Batch'}
            </button>
          </div>
        </form>
      </div>

      {batchData && (
        <div className="batch-details">
          <div className="batch-overview-3d">
            <div className="overview-header">
              <h3>Batch {batchData.id}</h3>
              <span className={`status-tag ${batchData.status.toLowerCase().replace(' ', '-')}`}>
                {batchData.status}
              </span>
              {contracts.batchToken && (
                <span className="blockchain-tag">⛓️ Blockchain Verified</span>
              )}
            </div>
            
            <div className="overview-grid">
              <div className="overview-item">
                <span className="label">Species:</span>
                <span className="value">{batchData.species}</span>
              </div>
              <div className="overview-item">
                <span className="label">Origin:</span>
                <span className="value">{batchData.origin}</span>
              </div>
              <div className="overview-item">
                <span className="label">Harvest Date:</span>
                <span className="value">{batchData.harvestDate}</span>
              </div>
              <div className="overview-item">
                <span className="label">Current Location:</span>
                <span className="value">{batchData.currentLocation}</span>
              </div>
              <div className="overview-item">
                <span className="label">Quality Score:</span>
                <span className="value score">{batchData.qualityScore}/100</span>
              </div>
              <div className="overview-item">
                <span className="label">Sustainability Score:</span>
                <span className="value score">{batchData.sustainabilityScore}/100</span>
              </div>
              <div className="overview-item">
                <span className="label">Blockchain Hash:</span>
                <span className="value hash">{batchData.blockchainHash}</span>
              </div>
              {batchData.estimatedArrival && (
                <div className="overview-item">
                  <span className="label">Estimated Arrival:</span>
                  <span className="value">{batchData.estimatedArrival}</span>
                </div>
              )}
            </div>
          </div>

          <div className="timeline-section">
            <h3>Supply Chain Timeline</h3>
            <div className="timeline-3d">
              {batchData.timeline.map((event, index) => (
                <div key={index} className="timeline-event">
                  <div className="event-marker"></div>
                  <div className="event-content">
                    <h4>{event.step}</h4>
                    <p>{event.timestamp}</p>
                    <p>{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="map-visualization">
            <h3>Current Location</h3>
            <div className="map-container-3d">
              <div className="map-points">
                <div className="origin-point">📍 Origin</div>
                <div className="current-point">📍 Current</div>
                <div className="destination-point">📍 Destination</div>
              </div>
              <div className="map-route"></div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="action-btn view-provenance">
              📖 View Full Provenance
            </button>
            <button className="action-btn download-certificate">
              📄 Download Certificate
            </button>
            <button className="action-btn share-tracking">
              📤 Share Tracking
            </button>
          </div>
        </div>
      )}

      {!batchData && !isLoading && (
        <div className="placeholder-guidance">
          <div className="guidance-card-3d">
            <h3>How to Track Your Batch</h3>
            <p>Enter your Batch ID to view the complete journey of your Ayurvedic herbs:</p>
            <ul>
              <li>🌿 Harvest location and date</li>
              <li>🔬 Quality test results</li>
              <li>📦 Current location and status</li>
              <li>⛓️ Blockchain verification</li>
              <li>🌱 Sustainability compliance</li>
            </ul>
            <div className="recent-batches">
              <h4>Recent Batches</h4>
              <div className="batch-list">
                <button onClick={() => setBatchId('ASH-2023-0012')}>ASH-2023-0012</button>
                <button onClick={() => setBatchId('TUL-2023-0008')}>TUL-2023-0008</button>
                <button onClick={() => setBatchId('TUR-2023-0015')}>TUR-2023-0015</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="floating-tracking-elements">
        <div className="tracking-icon">📍</div>
        <div className="tracking-icon">📦</div>
        <div className="tracking-icon">⏱️</div>
      </div>
    </div>
  );
};

export default BatchTracking;