import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import Auth from '../components/Common/Auth';
import './Login.css';

const Login = () => {
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { connectWeb3, account } = useWeb3();
  const navigate = useNavigate();

  const handleLogin = async (formData) => {
    try {
      setError('');
      
      // First connect wallet if not connected
      if (!account) {
        const web3Result = await connectWeb3();
        if (!web3Result.success) {
          setError(web3Result.error);
          return;
        }
      }
      
      // Then login with credentials
      const loginResult = await login(formData.email, formData.password, formData.role);
      
      if (loginResult.success) {
        navigate('/admin'); // Redirect to admin dashboard
      } else {
        setError(loginResult.error);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Auth onSubmit={handleLogin} isLogin={true} />
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Login;