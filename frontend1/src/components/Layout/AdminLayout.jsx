// src/components/Layout/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { useRoles } from '../../contexts/RoleContext';
import Header from '../Common/Header';
import Footer from '../Common/Footer';
import WalletConnect from '../WalletConnect';
import './AdminLayout.css';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { account, connect } = useWeb3();
  const { roles, loading: rolesLoading } = useRoles();

  // Derive a simple "app role" label from on-chain roles
  const deriveAppRole = () => {
    if (!roles) return null;
    if (roles.DEFAULT_ADMIN_ROLE) return 'admin';
    if (roles.MANUFACTURER_ROLE) return 'manager';
    if (roles.LAB_ROLE) return 'lab';
    if (roles.FARMER_ROLE) return 'farmer';
    if (roles.CONSUMER_ROLE) return 'consumer';
    return null;
  };

  const appRole = deriveAppRole();

  const getRoleIcon = () => {
    switch (appRole) {
      case 'farmer': return '👨‍🌾';
      case 'lab': return '🔬';
      case 'manager': return '👔';
      case 'admin': return '🛡️';
      default: return '👤';
    }
  };

  const getRoleName = () => {
    switch (appRole) {
      case 'farmer': return 'Farmer/Collector';
      case 'lab': return 'Laboratory Technician';
      case 'manager': return 'Supply Chain Manager';
      case 'admin': return 'Administrator';
      default: return 'User';
    }
  };

  // Menu items, some are restricted by app role
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin' },
    { id: 'collections', label: 'Collections', icon: '🌿', path: '/admin/farmer', allowed: ['farmer'] },
    { id: 'quality-tests', label: 'Quality Tests', icon: '🔍', path: '/admin/lab', allowed: ['lab'] },
    { id: 'batch-tracking', label: 'Batch Tracking', icon: '📦', path: '/admin/manager/tracking', allowed: ['manager'] },
    { id: 'reports', label: 'Reports', icon: '📈', path: '/admin/manager/reports', allowed: ['manager'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.allowed) return true;
    if (!roles) return false;
    return item.allowed.includes(appRole);
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      <Header />

      <div className="admin-container">
        {/* Sidebar Toggle Button */}
        <button 
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          ☰
        </button>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={closeSidebar}></div>
        )}

        {/* Sidebar */}
        <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo-3d">
              <span className="logo-icon">🌿</span>
              <span className="logo-text">VrikshaChain</span>
            </div>
            <button
              className="sidebar-close"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              ×
            </button>
          </div>

          <nav className="sidebar-nav">
            {filteredMenuItems.map(item => (
              <Link 
                key={item.id} 
                to={item.path} 
                className="nav-item-3d"
                onClick={closeSidebar}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">{getRoleIcon()}</div>
              <div className="user-details">
                <span className="user-name">
                  {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Not connected'}
                </span>
                <span className="user-role">
                  {rolesLoading ? 'Checking roles...' : getRoleName()}
                </span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-header internal-admin-header">
            <div className="header-left">
              <h1>Admin Dashboard</h1>
              <p>Role-based Access</p>
            </div>

            <div className="header-right">
              <div className="wallet-compact">
                {account ? (
                  <>
                    <div className="wallet-connected">
                      Connected: <strong>{account.slice(0,6)}...{account.slice(-4)}</strong>
                    </div>

                    <div className="wallet-role">
                      {roles?.DEFAULT_ADMIN_ROLE && <span className="badge">Admin</span>}
                      {roles?.FARMER_ROLE && <span className="badge">Farmer</span>}
                      {roles?.LAB_ROLE && <span className="badge">Lab</span>}
                      {roles?.MANUFACTURER_ROLE && <span className="badge">Manager</span>}
                    </div>
                  </>
                ) : (
                  <button className="btn-connect" onClick={connect}>Connect</button>
                )}
              </div>
            </div>
          </div>

          <div className="admin-content">
            {roles?.DEFAULT_ADMIN_ROLE && (
              <div style={{ marginBottom: 16 }}>
                <WalletConnect />
              </div>
            )}

            <Outlet />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default AdminLayout;