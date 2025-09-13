import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useWeb3 } from './contexts/Web3Context';

// Layouts
import ConsumerLayout from './components/Layout/ConsumerLayout';
import AdminLayout from './components/Layout/AdminLayout';

// Common Pages
import Home from './pages/Home';
import About from './components/Common/About';
import Contact from './components/Common/Contact';

// Consumer Pages
import ScanQR from './components/Consumer/ScanQR';
import ProductInfo from './components/Consumer/ProductInfo';
import ProvenanceView from './components/Consumer/ProvenanceView';

// Admin Pages
import FarmerDashboard from './components/Admin/Farmer/FarmerDashboard';
import CollectionEvent from './components/Admin/Farmer/CollectionEvent';
import LabDashboard from './components/Admin/Lab/LabDashboard';
import QualityTest from './components/Admin/Lab/QualityTest';
import ManagerDashboard from './components/Admin/Manager/ManagerDashboard';
import BatchTracking from './components/Admin/Manager/BatchTracking';
import SustainabilityReports from './components/Admin/Manager/SustainabilityReports';

// Auth
import Login from './pages/Login';

const AppRoutes = () => {
  const { isAuthenticated, userRole } = useAuth();
  const { isConnected } = useWeb3();

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole = null }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
    
    if (!isConnected) {
      return <div className="connection-required">Please connect your wallet to access this page</div>;
    }
    
    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <ConsumerLayout>
          <Home />
        </ConsumerLayout>
      } />
      <Route path="/about" element={
        <ConsumerLayout>
          <About />
        </ConsumerLayout>
      } />
      <Route path="/contact" element={
        <ConsumerLayout>
          <Contact />
        </ConsumerLayout>
      } />
      <Route path="/scan" element={
        <ConsumerLayout>
          <ScanQR />
        </ConsumerLayout>
      } />
      <Route path="/product/:id" element={
        <ConsumerLayout>
          <ProductInfo />
        </ConsumerLayout>
      } />
      <Route path="/provenance/:id" element={
        <ConsumerLayout>
          <ProvenanceView />
        </ConsumerLayout>
      } />
      <Route path="/login" element={<Login />} />
      
      {/* Admin Routes - Role Protected */}
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to={`/admin/${userRole}`} replace />} />
        <Route path="farmer" element={
          <ProtectedRoute requiredRole="farmer">
            <FarmerDashboard />
          </ProtectedRoute>
        } />
        <Route path="farmer/collection" element={
          <ProtectedRoute requiredRole="farmer">
            <CollectionEvent />
          </ProtectedRoute>
        } />
        <Route path="lab" element={
          <ProtectedRoute requiredRole="lab">
            <LabDashboard />
          </ProtectedRoute>
        } />
        <Route path="lab/quality-test" element={
          <ProtectedRoute requiredRole="lab">
            <QualityTest />
          </ProtectedRoute>
        } />
        <Route path="manager" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerDashboard />
          </ProtectedRoute>
        } />
        <Route path="manager/tracking" element={
          <ProtectedRoute requiredRole="manager">
            <BatchTracking />
          </ProtectedRoute>
        } />
        <Route path="manager/reports" element={
          <ProtectedRoute requiredRole="manager">
            <SustainabilityReports />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;