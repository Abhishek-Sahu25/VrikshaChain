// src/components/RoleRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRoles } from '../contexts/RoleContext';

export default function RoleRoute({ requiredRoleKey, children }) {
  const { loading, account, roles } = useRoles();

  if (loading) return <div>Loading roles...</div>;
  if (!account) return <Navigate to="/login" replace />; // or show "connect wallet" page

  // If requiredRoleKey is null/undefined, allow anyone connected
  if (!requiredRoleKey) return children;

  if (roles[requiredRoleKey]) return children;

  // else not authorized
  return <div style={{ padding: 24 }}>You are not authorized to view this page.</div>;
}
