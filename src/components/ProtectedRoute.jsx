import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, superAdminOnly = false, permissionKey = null }) {
  const { user, isAuthenticated, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isUserSuperAdmin = isSuperAdmin || user?.role === 'SUPER_ADMIN';

  if (superAdminOnly && !isUserSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  // Check specific permissions (if permissionKey is provided, and user is not Super Admin)
  if (permissionKey && !isUserSuperAdmin) {
    // If the permission is explicitly false, or if it doesn't exist, block access
    const hasPermission = user?.permissions?.[permissionKey]?.view === true || user?.permissions?.[permissionKey] === true;
    if (!hasPermission) {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
  }

  return children;
}
