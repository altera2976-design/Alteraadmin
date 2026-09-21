import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Admin403 from './Admin403';

export default function AdminProtectedRoute({ children, permissionKey = null, altPermissionKey = null }) {
  const { user, isAuthenticated, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4F6FA' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Must be authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Must have role ADMIN or SUPER_ADMIN (or role includes ADMIN)
  const role = (user?.role || '').toUpperCase();
  const isAdmin = isSuperAdmin || role === 'ADMIN' || role.includes('ADMIN') || role === 'SUPER_ADMIN';

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Active status check
  if (user?.status === 'INACTIVE') {
    return <Admin403 message="Your account has been deactivated. Please contact the Super Admin." />;
  }

  // Admin Panel Access check
  if (!isSuperAdmin && user?.role !== 'SUPER_ADMIN' && user?.isAdminPanelEnabled === false) {
    return <Admin403 message="Admin Dashboard access has been revoked. Please contact the Super Admin." />;
  }

  // Permission check if permissionKey provided
  if (permissionKey && !isSuperAdmin && user?.role !== 'SUPER_ADMIN') {
    const checkPerm = (key) => {
      if (!key) return undefined;
      const val = user?.permissions?.[key];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'object' && val !== null) {
        if (val.view === false) return false;
        if (val.view === true) return true;
        const hasAnyAction = Object.values(val).some((v) => v === true);
        if (hasAnyAction) return true;
        const hasAllFalse = Object.values(val).every((v) => v === false);
        if (hasAllFalse) return false;
      }
      return undefined;
    };

    const res1 = checkPerm(permissionKey);
    const res2 = altPermissionKey ? checkPerm(altPermissionKey) : undefined;
    const finalPerm = res1 !== undefined ? res1 : (res2 !== undefined ? res2 : true);

    if (finalPerm === false) {
      return <Admin403 message={`You do not have permission to access the '${permissionKey}' module.`} />;
    }
  }

  return children;
}
