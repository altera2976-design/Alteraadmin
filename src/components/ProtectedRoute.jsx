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
  const requiresSuperAdmin = superAdminOnly || ['employees', 'payroll', 'salary', 'tracking'].includes(permissionKey);

  if (requiresSuperAdmin && !isUserSuperAdmin) {
    return <Navigate to="/admin-panel" replace />;
  }

  if (permissionKey && !isUserSuperAdmin && user?.permissions && user.permissions[permissionKey] === false) {
    return <Navigate to="/admin-panel" replace />;
  }

  return children;
}
