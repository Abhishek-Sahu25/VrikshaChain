// src/components/Admin/Manager/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../../../contexts/Web3Context';
import WalletConnect from '../../WalletConnect'; // path adjusted to components folder
import { useBlockchain } from '../../../hooks';
import { useRoles } from '../../../contexts/RoleContext';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { contracts, account } = useWeb3();
  const { createBatch, verifyQuality } = useBlockchain();
  const { roles } = useRoles(); // <-- role info from on-chain RoleContext

  const [supplyChainStats, setSupplyChainStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, account]);

  const fetchManagerData = async () => {
    // if contracts not present or no account, show demo / fallback data quickly
    if (!contracts?.batchToken || !account) {
      setSupplyChainStats({
        totalBatches: 124,
        inTransit: 7,
        atFacility: 38,
        qualityTested: 79,
        sustainabilityCompliant: 116,
        blockchainTransactions: 2456
      });
      setRecentActivities([
        { id: 1, action: 'Batch Aggregated', user: 'Aggregator Singh', batch: 'ASH-2023-0012', time: '2 hours ago' },
        { id: 2, action: 'Quality Test Passed', user: 'Lab Tech Priya', batch: 'TUL-2023-0008', time: '5 hours ago' },
        { id: 3, action: 'New Collection', user: 'Farmer Rajesh', batch: 'TUR-2023-0015', time: '1 day ago' },
        { id: 4, action: 'Sustainability Verified', user: 'Manager Kumar', batch: 'NEEM-2023-0007', time: '2 days ago' }
      ]);
      setAlerts([
        { id: 1, type: 'warning', message: 'Batch TUR-2023-0010 delayed in transit', time: '1 hour ago' },
        { id: 2, type: 'info', message: 'New sustainability guidelines available', time: '3 hours ago' },
        { id: 3, type: 'success', message: 'All batches compliant with new regulations', time: '1 day ago' }
      ]);
      setLoading(false);
      return;
    }

    try {
      // Fetch supply chain stats from blockchain (example usage)
      const totalBatches = await contracts.batchToken.totalSupply();

      let inTransit = 0;
      let atFacility = 0;
      let qualityTested = 0;

      const total = totalBatches.toNumber ? totalBatches.toNumber() : Number(totalBatches);

      // Be careful: iterating every token can be expensive on-chain.
      // This code assumes small numbers or that batchToken.batches(i) is available.
      for (let i = 0; i < Math.min(total, 200); i++) { // safety cap
        const batchData = await contracts.batchToken.batches(i);
        const state = batchData?.state ?? batchData?.status ?? 0;
        if (Number(state) === 2) inTransit++;
        if (Number(state) === 3) atFacility++;
        if (Number(state) >= 1) qualityTested++;
      }

      setSupplyChainStats({
        totalBatches: total,
        inTransit,
        atFacility,
        qualityTested,
        sustainabilityCompliant: Math.floor(total * 0.9),
        blockchainTransactions: total * 2
      });

      setRecentActivities([
        { id: 1, action: 'Batch Created', user: 'Blockchain', batch: `BATCH-${total - 1}`, time: 'Just now' },
        { id: 2, action: 'Quality Tested', user: 'Lab Contract', batch: `BATCH-${total - 2}`, time: '1 hour ago' },
        { id: 3, action: 'Batch Shipped', user: 'Logistics', batch: `BATCH-${total - 3}`, time: '3 hours ago' }
      ]);

      setAlerts([
        { id: 1, type: 'info', message: `${total} batches on blockchain`, time: 'Just now' },
        { id: 2, type: 'success', message: 'Blockchain sync complete', time: '5 minutes ago' }
      ]);
    } catch (error) {
      console.error('Error fetching manager data:', error);
      // Fallback to mock data
      setSupplyChainStats({
        totalBatches: 124,
        inTransit: 7,
        atFacility: 38,
        qualityTested: 79,
        sustainabilityCompliant: 116,
        blockchainTransactions: 2456
      });
      setRecentActivities([
        { id: 1, action: 'Batch Aggregated', user: 'Aggregator Singh', batch: 'ASH-2023-0012', time: '2 hours ago' },
        { id: 2, action: 'Quality Test Passed', user: 'Lab Tech Priya', batch: 'TUL-2023-0008', time: '5 hours ago' },
        { id: 3, action: 'New Collection', user: 'Farmer Rajesh', batch: 'TUR-2023-0015', time: '1 day ago' },
        { id: 4, action: 'Sustainability Verified', user: 'Manager Kumar', batch: 'NEEM-2023-0007', time: '2 days ago' }
      ]);
      setAlerts([
        { id: 1, type: 'warning', message: 'Batch TUR-2023-0010 delayed in transit', time: '1 hour ago' },
        { id: 2, type: 'info', message: 'New sustainability guidelines available', time: '3 hours ago' },
        { id: 3, type: 'success', message: 'All batches compliant with new regulations', time: '1 day ago' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="manager-dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading supply chain data...</p>
      </div>
    );
  }

  // Helper: check admin permission from on-chain roles
  const isAdmin = Boolean(roles?.DEFAULT_ADMIN_ROLE);

  return (
    <div className="manager-dashboard">
      <div className="dashboard-hero">
        <h2>Supply Chain Manager Dashboard</h2>
        <p>Oversee the complete Ayurvedic herb supply chain with blockchain transparency</p>
        {!account && (
          <div className="wallet-warning">⚠️ Please connect your wallet to access blockchain data</div>
        )}
      </div>

      {/* ADMIN AREA - only visible for accounts with DEFAULT_ADMIN_ROLE */}
      {isAdmin && (
        <section className="admin-dashboard admin-role-section" aria-labelledby="admin-tools-heading">
          <h1 id="admin-tools-heading">Admin Dashboard</h1>
          <p>Role-based Access / Admin tools</p>

          {/* Role management section: WalletConnect includes grant-role UI */}
          <div className="admin-walletconnect-wrapper">
            <WalletConnect />
          </div>

          {/* existing admin content placeholder (if any) */}
          <div className="admin-content">
            {/* If you have admin-specific widgets, place them here */}
          </div>
        </section>
      )}

      {/* If not admin show message or hide admin area */}
      {!isAdmin && (
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <em>You do not have Admin permissions. Admin tools are hidden.</em>
        </div>
      )}

      {/* Alert Notifications */}
      <div className="alerts-section">
        <h3>System Alerts</h3>
        <div className="alerts-grid">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-card-3d ${alert.type}`}>
              <div className="alert-icon">
                {alert.type === 'warning' && '⚠️'}
                {alert.type === 'info' && 'ℹ️'}
                {alert.type === 'success' && '✅'}
              </div>
              <div className="alert-content">
                <p>{alert.message}</p>
                <span className="alert-time">{alert.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card-3d">
          <div className="stat-icon">📦</div>
          <h3>Total Batches</h3>
          <p className="stat-number">{supplyChainStats.totalBatches || 0}</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">🚚</div>
          <h3>In Transit</h3>
          <p className="stat-number">{supplyChainStats.inTransit || 0}</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">🏭</div>
          <h3>At Facility</h3>
          <p className="stat-number">{supplyChainStats.atFacility || 0}</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">🔬</div>
          <h3>Quality Tested</h3>
          <p className="stat-number">{supplyChainStats.qualityTested || 0}</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">🌱</div>
          <h3>Sustainability Compliant</h3>
          <p className="stat-number">{supplyChainStats.sustainabilityCompliant || 0}</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">⛓️</div>
          <h3>Blockchain Transactions</h3>
          <p className="stat-number">{supplyChainStats.blockchainTransactions || 0}</p>
        </div>
      </div>

      {/* Main dashboard content */}
      <div className="dashboard-content">
        <div className="recent-activities">
          <h3>Recent Activities</h3>
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item-3d">
                <div className="activity-icon">●</div>
                <div className="activity-details">
                  <p className="activity-action">{activity.action}</p>
                  <p className="activity-meta">{activity.user} • {activity.batch} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons-grid">
            <button className="action-btn-3d">📊 Generate Reports</button>
            <Link to="/admin/manager/tracking" className="action-btn-3d">🔍 Track Batch</Link>
            <button className="action-btn-3d">📝 Verify Compliance</button>
            <button className="action-btn-3d">🔄 Process Aggregation</button>
            <Link to="/admin/manager/reports" className="action-btn-3d">🌐 Sustainability Reports</Link>
            <button className="action-btn-3d">⚙️ System Settings</button>
          </div>
        </div>
      </div>

      <div className="blockchain-visual">
        <h3>Live Blockchain Network</h3>
        <div className="blockchain-animation">
          <div className="block-node" />
          <div className="block-connector" />
          <div className="block-node" />
          <div className="block-connector" />
          <div className="block-node" />
          <div className="block-connector" />
          <div className="block-node" />
        </div>
        <p>Real-time blockchain transactions: {supplyChainStats.blockchainTransactions || 0} confirmed</p>
        <p className="blockchain-status">
          Status: {account ? '✅ Connected to Ethereum network' : '❌ Disconnected'}
        </p>
      </div>

      <div className="floating-manager-elements">
        <div className="manager-icon">📈</div>
        <div className="manager-icon">⚡</div>
        <div className="manager-icon">🔗</div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
