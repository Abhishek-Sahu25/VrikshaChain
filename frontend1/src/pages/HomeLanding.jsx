import React from 'react';
import { useRoles } from '../contexts/RoleContext';
import FarmerDashboard from './FarmerDashboard';
import AdminDashboard from './AdminDashboard';
import ConsumerView from './ConsumerView';

export default function HomeLanding() {
  const { roles, loading } = useRoles();
  if (loading) return <div>Loading...</div>;

  if (roles.FARMER_ROLE) {
    return <FarmerDashboard />;
  }
  if (roles.DEFAULT_ADMIN_ROLE) {
    return <AdminDashboard />;
  }
  if (roles.CONSUMER_ROLE) {
    return <ConsumerView />;
  }
  // default generic landing
  return (
    <div>
      <h1>Welcome to VrikshaChain</h1>
      <p>Public landing content for visitors / not-yet-registered users.</p>
    </div>
  );
}
