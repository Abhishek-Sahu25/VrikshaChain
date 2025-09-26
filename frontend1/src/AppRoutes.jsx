// src/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRoles } from './contexts/RoleContext';

// Layouts
import ConsumerLayout from './components/Layout/ConsumerLayout';
import AdminLayout from './components/Layout/AdminLayout';

// Pages / components
import Home from './pages/Home';
import About from './components/Common/About';
import Contact from './components/Common/Contact';
import ScanQR from './components/Consumer/ScanQR';
import ProductInfo from './components/Consumer/ProductInfo';
import ProvenanceView from './components/Consumer/ProvenanceView';
import FarmerDashboard from './components/Admin/Farmer/FarmerDashboard';
import CollectionEvent from './components/Admin/Farmer/CollectionEvent';
import LabDashboard from './components/Admin/Lab/LabDashboard';
import QualityTest from './components/Admin/Lab/QualityTest';
import ManagerDashboard from './components/Admin/Manager/ManagerDashboard';
import BatchTracking from './components/Admin/Manager/BatchTracking';
import SustainabilityReports from './components/Admin/Manager/SustainabilityReports';
import Login from './pages/Login';

// Map app role -> contract constant key used in RoleContext
const ROLE_APP_TO_CONTRACT_KEY = {
  admin: 'DEFAULT_ADMIN_ROLE',
  farmer: 'FARMER_ROLE',
  lab: 'LAB_ROLE',
  manager: 'MANUFACTURER_ROLE',
  qa: 'QA_ROLE',
  consumer: 'CONSUMER_ROLE',
  relayer: 'RELAYER_ROLE',
  aggregator: 'AGGREGATOR_ROLE'
};

// Strict Role-protected route (no admin override)
const RoleProtectedRoute = ({ children, requiredAppRole = null }) => {
  const { account, roles, loading } = useRoles();

  if (loading) return <div style={{ padding: 24 }}>Checking permissions on-chain...</div>;
  if (!account) return <div style={{ padding: 24 }}>Please connect your wallet to access this page.</div>;
  if (!requiredAppRole) return children;

  const contractKey = ROLE_APP_TO_CONTRACT_KEY[requiredAppRole];
  if (!contractKey) return <div style={{ padding: 24 }}>Configuration error: role mapping not found.</div>;

  const hasRole = Boolean(roles?.[contractKey]);
  if (hasRole) return children;

  return <div style={{ padding: 24 }}>You are not authorized to view this page.</div>;
};

// Role-aware home redirect
const HomeRedirect = () => {
  const { roles, loading } = useRoles();

  if (loading) {
    return (
      <ConsumerLayout>
        <div style={{ padding: 40 }}>Checking your blockchain roles...</div>
      </ConsumerLayout>
    );
  }

  if (roles?.DEFAULT_ADMIN_ROLE || roles?.MANUFACTURER_ROLE) return <Navigate to="/admin/manager" replace />;
  if (roles?.LAB_ROLE) return <Navigate to="/admin/lab" replace />;
  if (roles?.FARMER_ROLE) return <Navigate to="/admin/farmer" replace />;

  // default public
  return (
    <ConsumerLayout>
      <Home />
    </ConsumerLayout>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/about" element={<ConsumerLayout><About /></ConsumerLayout>} />
      <Route path="/contact" element={<ConsumerLayout><Contact /></ConsumerLayout>} />
      <Route path="/scan" element={<ConsumerLayout><ScanQR /></ConsumerLayout>} />
      <Route path="/product/:id" element={<ConsumerLayout><ProductInfo /></ConsumerLayout>} />
      <Route path="/provenance/:id" element={<ConsumerLayout><ProvenanceView /></ConsumerLayout>} />
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <RoleProtectedRoute>
          <AdminLayout />
        </RoleProtectedRoute>
      }>
        <Route index element={<Navigate to={`/admin/farmer`} replace />} />

        <Route path="farmer" element={
          <RoleProtectedRoute requiredAppRole="farmer">
            <FarmerDashboard />
          </RoleProtectedRoute>
        } />
        <Route path="farmer/collection" element={
          <RoleProtectedRoute requiredAppRole="farmer">
            <CollectionEvent />
          </RoleProtectedRoute>
        } />
        <Route path="lab" element={
          <RoleProtectedRoute requiredAppRole="lab">
            <LabDashboard />
          </RoleProtectedRoute>
        } />
        <Route path="lab/quality-test" element={
          <RoleProtectedRoute requiredAppRole="lab">
            <QualityTest />
          </RoleProtectedRoute>
        } />
        <Route path="manager" element={
          <RoleProtectedRoute requiredAppRole="manager">
            <ManagerDashboard />
          </RoleProtectedRoute>
        } />
        <Route path="manager/tracking" element={
          <RoleProtectedRoute requiredAppRole="manager">
            <BatchTracking />
          </RoleProtectedRoute>
        } />
        <Route path="manager/reports" element={
          <RoleProtectedRoute requiredAppRole="manager">
            <SustainabilityReports />
          </RoleProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;