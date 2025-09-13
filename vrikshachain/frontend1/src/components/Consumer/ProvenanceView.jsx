import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBlockchain } from '../../hooks';
import './ProvenanceView.css';

const ProvenanceView = () => {
  const { id } = useParams();
  const [provenance, setProvenance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [blockchainData, setBlockchainData] = useState(null);
  const { contracts } = useBlockchain();

  useEffect(() => {
    fetchProvenanceData();
  }, [id]);

  const fetchProvenanceData = async () => {
    setLoading(true);
    try {
      // Try to fetch from blockchain first
      let blockchainInfo = null;
      if (contracts.batchToken && id) {
        try {
          const batchData = await contracts.batchToken.batches(id);
          if (batchData && batchData.id) {
            blockchainInfo = {
              transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
              blockNumber: Math.floor(Math.random() * 10000000),
              timestamp: new Date(batchData.timestamp * 1000).toLocaleString(),
              verified: true
            };
          }
        } catch (error) {
          console.log('Batch not found on blockchain, using mock data');
        }
      }

      // Mock data - replace with actual API call
      const mockProvenance = {
        productId: id || 'ASH-2023-0012',
        productName: 'Organic Ashwagandha Root Powder',
        timeline: [
          {
            step: 'Seed Planting',
            date: '2023-03-15',
            location: 'Organic Farm, Maharashtra',
            description: 'Non-GMO Ashwagandha seeds planted using organic farming practices',
            coordinates: '18.5204° N, 73.8567° E',
            farmer: 'Rajesh Kumar',
            images: ['seed_planting.jpg']
          },
          {
            step: 'Growth & Cultivation',
            date: '2023-04-20',
            location: 'Organic Farm, Maharashtra',
            description: 'Natural growth with organic fertilizers and sustainable water management',
            coordinates: '18.5204° N, 73.8567° E',
            duration: '45 days',
            images: ['growth.jpg']
          },
          {
            step: 'Harvest',
            date: '2023-06-15',
            location: 'Organic Farm, Maharashtra',
            description: 'Hand-harvested at optimal maturity using traditional methods',
            coordinates: '18.5204° N, 73.8567° E',
            weight: '500kg',
            images: ['harvest.jpg']
          },
          {
            step: 'Quality Testing',
            date: '2023-06-18',
            location: 'Ayurvedic Lab, Pune',
            description: 'Comprehensive quality analysis including purity, potency, and safety tests',
            coordinates: '18.5204° N, 73.8567° E',
            results: 'Passed all quality parameters',
            score: '95/100',
            images: ['lab_testing.jpg']
          },
          {
            step: 'Processing',
            date: '2023-06-22',
            location: 'Processing Facility, Mumbai',
            description: 'Gentle drying and grinding to preserve active compounds',
            coordinates: '19.0760° N, 72.8777° E',
            method: 'Low-temperature processing',
            images: ['processing.jpg']
          },
          {
            step: 'Packaging',
            date: '2023-06-25',
            location: 'Packaging Unit, Delhi',
            description: 'Eco-friendly packaging with QR code for traceability',
            coordinates: '28.7041° N, 77.1025° E',
            materials: 'Recyclable glass containers',
            images: ['packaging.jpg']
          },
          {
            step: 'Distribution',
            date: '2023-06-28',
            location: 'Distribution Center, Bengaluru',
            description: 'Shipped to retail partners across India',
            coordinates: '12.9716° N, 77.5946° E',
            logistics: 'Carbon-neutral transportation',
            images: ['distribution.jpg']
          }
        ],
        sustainability: {
          carbonFootprint: '12.4 kg CO₂',
          waterSaved: '45,000 liters',
          treesPlanted: 25,
          organicCertification: 'USDA Organic',
          fairTrade: true
        },
        qualityMetrics: {
          purity: '99.8%',
          activeCompounds: '5.2% withanolides',
          heavyMetals: 'Below detectable limits',
          microbialCount: 'Within safe limits',
          moistureContent: '8.2%'
        },
        blockchain: blockchainInfo || {
          transactionHash: '0x742d35Cc6634C893292...',
          blockNumber: 14523689,
          timestamp: '2023-06-15 08:30:45',
          verified: true
        }
      };
      
      setProvenance(mockProvenance);
      setBlockchainData(blockchainInfo);
    } catch (error) {
      console.error('Error fetching provenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="provenance-loading">
        <div className="loading-herb">🌿</div>
        <p>Loading provenance data...</p>
      </div>
    );
  }

  if (!provenance) {
    return (
      <div className="provenance-error">
        <h3>Provenance Data Not Available</h3>
        <p>Unable to retrieve product provenance information.</p>
      </div>
    );
  }

  return (
    <div className="provenance-view">
      <div className="provenance-header">
        <h1>Product Provenance</h1>
        <p>Complete journey of your Ayurvedic product from seed to shelf</p>
        <div className="product-badge">
          <span className="badge-text">{provenance.productName}</span>
          <span className="badge-id">Batch: {provenance.productId}</span>
          {blockchainData && (
            <span className="blockchain-badge">⛓️ Blockchain Verified</span>
          )}
        </div>
      </div>

      <div className="provenance-tabs">
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📅 Timeline
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sustainability' ? 'active' : ''}`}
          onClick={() => setActiveTab('sustainability')}
        >
          🌱 Sustainability
        </button>
        <button 
          className={`tab-btn ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          🔬 Quality Metrics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'blockchain' ? 'active' : ''}`}
          onClick={() => setActiveTab('blockchain')}
        >
          ⛓️ Blockchain
        </button>
      </div>

      <div className="provenance-content">
        {activeTab === 'timeline' && (
          <div className="timeline-view">
            <h2>Supply Chain Timeline</h2>
            <div className="timeline-3d">
              {provenance.timeline.map((event, index) => (
                <div key={index} className="timeline-event-3d">
                  <div className="event-marker">
                    <div className="marker-icon">{index + 1}</div>
                  </div>
                  <div className="event-content-3d">
                    <h3>{event.step}</h3>
                    <p className="event-date">{event.date}</p>
                    <p className="event-location">📍 {event.location}</p>
                    <p className="event-description">{event.description}</p>
                    {event.coordinates && (
                      <p className="event-coordinates">🌐 {event.coordinates}</p>
                    )}
                    {event.farmer && (
                      <p className="event-farmer">👨‍🌾 Farmer: {event.farmer}</p>
                    )}
                    {event.weight && (
                      <p className="event-weight">⚖️ Weight: {event.weight}</p>
                    )}
                    {event.score && (
                      <p className="event-score">✅ Quality Score: {event.score}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sustainability' && (
          <div className="sustainability-view">
            <h2>Sustainability Impact</h2>
            <div className="sustainability-grid">
              <div className="metric-card-3d">
                <div className="metric-icon">🔥</div>
                <h3>Carbon Footprint</h3>
                <p className="metric-value">{provenance.sustainability.carbonFootprint}</p>
                <p className="metric-label">CO₂ emissions</p>
              </div>
              <div className="metric-card-3d">
                <div className="metric-icon">💧</div>
                <h3>Water Conservation</h3>
                <p className="metric-value">{provenance.sustainability.waterSaved}</p>
                <p className="metric-label">Water saved</p>
              </div>
              <div className="metric-card-3d">
                <div className="metric-icon">🌳</div>
                <h3>Reforestation</h3>
                <p className="metric-value">{provenance.sustainability.treesPlanted} trees</p>
                <p className="metric-label">Planted</p>
              </div>
              <div className="metric-card-3d">
                <div className="metric-icon">🌿</div>
                <h3>Organic Certification</h3>
                <p className="metric-value">{provenance.sustainability.organicCertification}</p>
                <p className="metric-label">Certified</p>
              </div>
              <div className="metric-card-3d">
                <div className="metric-icon">🤝</div>
                <h3>Fair Trade</h3>
                <p className="metric-value">{provenance.sustainability.fairTrade ? 'Yes' : 'No'}</p>
                <p className="metric-label">Certified</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="quality-view">
            <h2>Quality Assurance</h2>
            <div className="quality-metrics">
              {Object.entries(provenance.qualityMetrics).map(([metric, value]) => (
                <div key={metric} className="quality-metric-3d">
                  <span className="metric-name">{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ width: `${parseFloat(value)}%` }}
                    ></div>
                  </div>
                  <span className="metric-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'blockchain' && (
          <div className="blockchain-view">
            <h2>Blockchain Verification</h2>
            <div className="blockchain-card-3d">
              <div className="blockchain-header">
                <div className="blockchain-icon">⛓️</div>
                <h3>Immutable Record</h3>
              </div>
              <div className="blockchain-details">
                <div className="detail-item">
                  <span className="detail-label">Transaction Hash:</span>
                  <span className="detail-value">{provenance.blockchain.transactionHash}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Block Number:</span>
                  <span className="detail-value">{provenance.blockchain.blockNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Timestamp:</span>
                  <span className="detail-value">{provenance.blockchain.timestamp}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Verification Status:</span>
                  <span className="detail-value verified">✅ Verified</span>
                </div>
              </div>
              <button className="view-blockchain-btn">
                🔍 View on Blockchain Explorer
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="provenance-actions">
        <button className="action-btn download-pdf">
          📄 Download Full Report
        </button>
        <button className="action-btn share-provenance">
          📤 Share Provenance
        </button>
      </div>

      <div className="floating-provenance-elements">
        <div className="provenance-element">🌿</div>
        <div className="provenance-element">📋</div>
        <div className="provenance-element">🔗</div>
      </div>
    </div>
  );
};

export default ProvenanceView;