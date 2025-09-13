import React, { useState } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import './Auth.css';

const Auth = ({ onSubmit, isLogin = true }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'farmer'
  });
  const { account, connectWeb3 } = useWeb3();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleWalletConnect = async () => {
    if (!account) {
      await connectWeb3();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <div className="auth-switch">
            <button 
              className={isLogin ? 'active' : ''}
              onClick={() => window.location.href = isLogin ? '/register' : '/login'}
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </div>
        </div>

        <div className="wallet-status">
          {account ? (
            <div className="wallet-connected">
              <span className="status-icon">✅</span>
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <button className="connect-wallet-btn" onClick={handleWalletConnect}>
              <span className="wallet-icon">🔗</span>
              Connect Wallet
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="farmer">Farmer/Collector</option>
                <option value="lab">Laboratory</option>
                <option value="manager">Manufacturer</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit"
            disabled={!account}
          >
            {isLogin ? 'Login' : 'Create Account'}
          </button>

          {!account && (
            <div className="wallet-required">
              <span>⚠️ Please connect your wallet first</span>
            </div>
          )}
        </form>

        <div className="auth-herbs">
          <div className="floating-herb">🌿</div>
          <div className="floating-herb">🌿</div>
          <div className="floating-herb">🌿</div>
        </div>
      </div>
    </div>
  );
};

export default Auth;