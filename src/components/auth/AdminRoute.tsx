import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps a route so only system_admin can access it.
 * Unauthenticated users → login, authenticated non-admins → /dashboard.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isSystemAdmin, currentRole } = useRole();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // currentRole defaults to 'standard_user' while loading from Firestore,
  // so wait until it's been resolved (non-default state has been set)
  if (!isSystemAdmin && currentRole === 'standard_user') {
    // Redirect standard users away from admin-only pages
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
