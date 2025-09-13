import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../../contexts/Web3Context';
import { useBlockchain } from '../../../hooks';
import { Link } from 'react-router-dom';
import './FarmerDashboard.css';

const FarmerDashboard = () => {
  const { contracts, account } = useWeb3();
  const { createBatch } = useBlockchain();
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState({
    totalCollections: 0,
    pendingVerification: 0,
    approvedCollections: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarmerData();
  }, [contracts, account]);

  const fetchFarmerData = async () => {
    if (!contracts.batchToken || !account) {
      // Use mock data if contracts not loaded
      setCollections([
        { id: 1, species: 'Ashwagandha', weight: '50kg', date: '2023-06-15', status: 'Approved', location: '12.9716° N, 77.5946° E' },
        { id: 2, species: 'Tulsi', weight: '30kg', date: '2023-06-18', status: 'Pending', location: '12.9716° N, 77.5946° E' },
        { id: 3, species: 'Turmeric', weight: '75kg', date: '2023-06-20', status: 'Approved', location: '12.9716° N, 77.5946° E' }
      ]);
      setStats({
        totalCollections: 15,
        pendingVerification: 2,
        approvedCollections: 13
      });
      setLoading(false);
      return;
    }

    try {
      // Fetch farmer's batches from blockchain
      const totalBatches = await contracts.batchToken.balanceOf(account);
      const batches = [];

      for (let i = 0; i < totalBatches.toNumber(); i++) {
        const tokenId = await contracts.batchToken.tokenOfOwnerByIndex(account, i);
        const batchData = await contracts.batchToken.batches(tokenId);
        
        batches.push({
          id: tokenId.toNumber(),
          species: 'Herb', // You might want to store species in metadata
          weight: `${batchData.weight || '0'}kg`,
          date: new Date(batchData.timestamp * 1000).toLocaleDateString(),
          status: ['Created', 'Tested', 'Processed', 'Shipped'][batchData.state] || 'Unknown',
          location: 'GPS Location' // Store location in metadata
        });
      }

      setCollections(batches);
      setStats({
        totalCollections: totalBatches.toNumber(),
        pendingVerification: batches.filter(b => b.status === 'Created').length,
        approvedCollections: batches.filter(b => b.status !== 'Created').length
      });
    } catch (error) {
      console.error('Error fetching farmer data:', error);
      // Fallback to mock data
      setCollections([
        { id: 1, species: 'Ashwagandha', weight: '50kg', date: '2023-06-15', status: 'Approved', location: '12.9716° N, 77.5946° E' },
        { id: 2, species: 'Tulsi', weight: '30kg', date: '2023-06-18', status: 'Pending', location: '12.9716° N, 77.5946° E' },
        { id: 3, species: 'Turmeric', weight: '75kg', date: '2023-06-20', status: 'Approved', location: '12.9716° N, 77.5946° E' }
      ]);
      setStats({
        totalCollections: 15,
        pendingVerification: 2,
        approvedCollections: 13
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="farmer-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading farmer data...</p>
      </div>
    );
  }

  return (
    <div className="farmer-dashboard">
      <div className="dashboard-hero">
        <h2>Farmer Dashboard</h2>
        <p>Manage your herb collections and track their journey on the blockchain</p>
      </div>
      
      <div className="stats-cards">
        <div className="stat-card-3d">
          <div className="stat-icon">🌿</div>
          <h3>Total Collections</h3>
          <p className="stat-number">{stats.totalCollections}</p>
        </div>
        
        <div className="stat-card-3d">
          <div className="stat-icon">⏳</div>
          <h3>Pending Verification</h3>
          <p className="stat-number">{stats.pendingVerification}</p>
        </div>
        
        <div className="stat-card-3d">
          <div className="stat-icon">✅</div>
          <h3>Approved Collections</h3>
          <p className="stat-number">{stats.approvedCollections}</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">⛓️</div>
          <h3>Blockchain</h3>
          <p className="stat-number">{account ? 'Connected' : 'Disconnected'}</p>
        </div>
      </div>

      <div className="recent-collections">
        <h3>Recent Collections</h3>
        {collections.length === 0 ? (
          <div className="no-collections">
            <p>No collections found. Create your first batch!</p>
          </div>
        ) : (
          <div className="collections-table">
            <div className="table-header">
              <span>Species</span>
              <span>Weight</span>
              <span>Date</span>
              <span>Status</span>
              <span>Location</span>
              <span>Actions</span>
            </div>
            {collections.map(collection => (
              <div key={collection.id} className="table-row-3d">
                <span>{collection.species}</span>
                <span>{collection.weight}</span>
                <span>{collection.date}</span>
                <span className={`status ${collection.status.toLowerCase()}`}>{collection.status}</span>
                <span>{collection.location}</span>
                <div className="action-buttons">
                  <button className="view-btn" onClick={() => window.open(`/product/${collection.id}`, '_blank')}>
                    👁️ View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link to="/admin/farmer/collection" className="new-collection-btn-3d">
        🌱 Record New Collection
      </Link>

      <div className="floating-herbs">
        <div className="herb-float">🌿</div>
        <div className="herb-float">🌿</div>
        <div className="herb-float">🌿</div>
      </div>
    </div>
  );
};

export default FarmerDashboard;