import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import Header from '../Common/Header';
import Footer from '../Common/Footer';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { userRole, logout } = useAuth();
  const { account } = useWeb3();

  const getRoleIcon = () => {
    switch (userRole) {
      case 'farmer': return '👨‍🌾';
      case 'lab': return '🔬';
      case 'manager': return '👔';
      default: return '👤';
    }
  };

  const getRoleName = () => {
    switch (userRole) {
      case 'farmer': return 'Farmer/Collector';
      case 'lab': return 'Laboratory Technician';
      case 'manager': return 'Supply Chain Manager';
      default: return 'Administrator';
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin' },
    { id: 'collections', label: 'Collections', icon: '🌿', path: '/admin/farmer', roles: ['farmer'] },
    { id: 'quality-tests', label: 'Quality Tests', icon: '🔍', path: '/admin/lab', roles: ['lab'] },
    { id: 'batch-tracking', label: 'Batch Tracking', icon: '📦', path: '/admin/manager/tracking', roles: ['manager'] },
    { id: 'reports', label: 'Reports', icon: '📈', path: '/admin/manager/reports', roles: ['manager'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  return (
    <div className="admin-layout">
      <Header />
      
      <div className="admin-container">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo-3d">
              <span className="logo-icon">🌿</span>
              <span className="logo-text">VrikshaChain</span>
            </div>
            <button 
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="sidebar-nav">
            {filteredMenuItems.map(item => (
              <a
                key={item.id}
                href={item.path}
                className="nav-item-3d"
              >
                <span className="nav-icon">{item.icon}</span>
                {isSidebarOpen && <span className="nav-label">{item.label}</span>}
              </a>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">{getRoleIcon()}</div>
              {isSidebarOpen && (
                <div className="user-details">
                  <span className="user-name">Admin User</span>
                  <span className="user-role">{getRoleName()}</span>
                  <span className="wallet-address">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</span>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={logout}>
              <span className="logout-icon">🚪</span>
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          <div className="admin-content">
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminLayout;