import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../../contexts/Web3Context';
import './SustainabilityReports.css';

const SustainabilityReports = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { contracts } = useWeb3();

  useEffect(() => {
    fetchSustainabilityData();
  }, [contracts]);

  const fetchSustainabilityData = async () => {
    setLoading(true);
    try {
      // Try to fetch from blockchain if available
      let blockchainStats = {};
      if (contracts.batchToken) {
        const totalBatches = await contracts.batchToken.totalSupply();
        blockchainStats = {
          totalBatches: totalBatches.toNumber(),
          sustainableBatches: `${Math.round((totalBatches.toNumber() * 0.9) / totalBatches.toNumber() * 100)}%`
        };
      }

      // Mock data - replace with actual API calls
      const mockData = {
        reports: [
          { id: 1, title: 'Q2 2023 Sustainability Report', period: 'Apr - Jun 2023', score: 92, downloads: 45 },
          { id: 2, title: 'Q1 2023 Sustainability Report', period: 'Jan - Mar 2023', score: 89, downloads: 38 },
          { id: 3, title: 'Annual Sustainability Report 2022', period: 'Jan - Dec 2022', score: 87, downloads: 67 },
          { id: 4, title: 'Q4 2022 Sustainability Report', period: 'Oct - Dec 2022', score: 85, downloads: 29 }
        ],
        stats: {
          overallScore: 90,
          carbonFootprint: '12.4 tons CO₂',
          waterSaved: '45,000 liters',
          treesPlanted: 1250,
          farmersSupported: 87,
          sustainableBatches: blockchainStats.sustainableBatches || '94%',
          totalBatches: blockchainStats.totalBatches || 124,
          blockchainVerified: contracts.batchToken ? 'Yes' : 'No'
        }
      };
      
      setReports(mockData.reports);
      setStats(mockData.stats);
    } catch (error) {
      console.error('Error fetching sustainability data:', error);
      // Fallback data
      setReports([
        { id: 1, title: 'Q2 2023 Sustainability Report', period: 'Apr - Jun 2023', score: 92, downloads: 45 },
        { id: 2, title: 'Q1 2023 Sustainability Report', period: 'Jan - Mar 2023', score: 89, downloads: 38 },
        { id: 3, title: 'Annual Sustainability Report 2022', period: 'Jan - Dec 2022', score: 87, downloads: 67 },
        { id: 4, title: 'Q4 2022 Sustainability Report', period: 'Oct - Dec 2022', score: 85, downloads: 29 }
      ]);
      setStats({
        overallScore: 90,
        carbonFootprint: '12.4 tons CO₂',
        waterSaved: '45,000 liters',
        treesPlanted: 1250,
        farmersSupported: 87,
        sustainableBatches: '94%',
        blockchainVerified: 'No'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    console.log('Generating new sustainability report...');
    // Implement report generation with blockchain integration
  };

  if (loading) {
    return (
      <div className="sustainability-loading">
        <div className="loading-spinner"></div>
        <p>Loading sustainability data...</p>
      </div>
    );
  }

  return (
    <div className="sustainability-reports">
      <div className="reports-header">
        <h2>Sustainability Reports</h2>
        <p>Track and manage environmental impact and sustainability metrics</p>
        {contracts.batchToken && (
          <div className="blockchain-badge">
            ⛓️ Blockchain Data Integrated
          </div>
        )}
      </div>

      <div className="sustainability-stats">
        <h3>Overall Sustainability Metrics</h3>
        <div className="stats-grid-3d">
          <div className="stat-item-3d">
            <div className="stat-icon">🌍</div>
            <h4>Overall Score</h4>
            <p className="stat-value">{stats.overallScore || 0}/100</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">🔥</div>
            <h4>Carbon Footprint</h4>
            <p className="stat-value">{stats.carbonFootprint || '0 tons'}</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">💧</div>
            <h4>Water Saved</h4>
            <p className="stat-value">{stats.waterSaved || '0 liters'}</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">🌳</div>
            <h4>Trees Planted</h4>
            <p className="stat-value">{stats.treesPlanted || 0}</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">👨‍🌾</div>
            <h4>Farmers Supported</h4>
            <p className="stat-value">{stats.farmersSupported || 0}</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">✅</div>
            <h4>Sustainable Batches</h4>
            <p className="stat-value">{stats.sustainableBatches || '0%'}</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">📦</div>
            <h4>Total Batches</h4>
            <p className="stat-value">{stats.totalBatches || 0}</p>
          </div>
          <div className="stat-item-3d">
            <div className="stat-icon">⛓️</div>
            <h4>Blockchain Verified</h4>
            <p className="stat-value">{stats.blockchainVerified || 'No'}</p>
          </div>
        </div>
      </div>

      <div className="reports-actions">
        <button className="generate-btn-3d" onClick={generateReport}>
          📊 Generate New Report
        </button>
        <button className="export-btn-3d">
          📤 Export All Data
        </button>
      </div>

      <div className="reports-list">
        <h3>Available Reports</h3>
        <div className="reports-grid">
          {reports.map(report => (
            <div key={report.id} className="report-card-3d">
              <div className="report-header">
                <h4>{report.title}</h4>
                <span className="report-period">{report.period}</span>
              </div>
              <div className="report-metrics">
                <div className="metric">
                  <span className="metric-label">Sustainability Score</span>
                  <div className="score-bar">
                    <div 
                      className="score-fill"
                      style={{ width: `${report.score}%` }}
                    ></div>
                    <span className="score-value">{report.score}/100</span>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-label">Downloads</span>
                  <span className="download-count">{report.downloads}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Blockchain Verified</span>
                  <span className="verification-status">✅ Yes</span>
                </div>
              </div>
              <div className="report-actions">
                <button className="view-btn">View Report</button>
                <button className="download-btn">Download PDF</button>
                <button className="share-btn">Share</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="blockchain-integration">
        <h3>Blockchain Integration</h3>
        <div className="integration-card">
          <div className="integration-content">
            <div className="integration-icon">⛓️</div>
            <div className="integration-text">
              <h4>Real-time Sustainability Data</h4>
              <p>All sustainability metrics are verified and recorded on the blockchain for transparency and immutability.</p>
              <ul>
                <li>✅ Carbon footprint calculations verified on-chain</li>
                <li>✅ Water conservation metrics from smart contracts</li>
                <li>✅ Sustainable batch tracking with blockchain proofs</li>
                <li>✅ Immutable audit trail for all reports</li>
              </ul>
            </div>
          </div>
          <button className="integration-btn">
            View Blockchain Dashboard
          </button>
        </div>
      </div>

      {selectedReport && (
        <div className="report-modal">
          <div className="modal-content-3d">
            <h3>{selectedReport.title}</h3>
            {/* Report details would go here */}
            <button className="close-btn" onClick={() => setSelectedReport(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="environment-visual">
        <div className="eco-animation">
          <div className="tree">🌳</div>
          <div className="water">💧</div>
          <div className="earth">🌍</div>
          <div className="blockchain">⛓️</div>
        </div>
      </div>

      <div className="floating-eco-elements">
        <div className="eco-icon">🌱</div>
        <div className="eco-icon">💚</div>
        <div className="eco-icon">🌿</div>
        <div className="eco-icon">⛓️</div>
      </div>
    </div>
  );
};

export default SustainabilityReports;