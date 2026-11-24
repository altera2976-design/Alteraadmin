import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Admin403 from './Admin403';

export default function AdminProtectedRoute({ children, permissionKey = null, altPermissionKey = null, superAdminOnly = false }) {
  const { user, isAuthenticated, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F4F6FA' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #E2E8F0', borderTopColor: '#7A131A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
    return <Admin403 message="Admin Panel access has not been granted by Super Admin." />;
  }

  // Super Admin Only Route Check
  if (superAdminOnly && !isSuperAdmin && user?.role !== 'SUPER_ADMIN') {
    return <Admin403 message="Access Denied — You don't have permission to access this module." />;
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

    let finalPerm = checkPerm(permissionKey);
    if (finalPerm === undefined && altPermissionKey) {
      finalPerm = checkPerm(altPermissionKey);
    }

    // Special handling for CRM master and sub-modules
    if (permissionKey === 'crm' || permissionKey === 'crm_leads') {
      const crmSubKeys = ['crm', 'crm_leads', 'crm_customers', 'crm_followups', 'crm_pipeline', 'crm_consultations', 'crm_campaigns', 'crm_team', 'crm_settings', 'crm_reports'];
      const hasAnySubAllowed = crmSubKeys.some((k) => checkPerm(k) === true);
      const allExplicitlyDenied = crmSubKeys.filter(k => checkPerm(k) !== undefined).length > 0 && crmSubKeys.every(k => {
        const v = checkPerm(k);
        return v === false || v === undefined;
      });

      if (hasAnySubAllowed) {
        finalPerm = true;
      } else if (allExplicitlyDenied || finalPerm === false) {
        finalPerm = false;
      }
    }

    if (finalPerm === false) {
      return <Admin403 message="Access Denied — You don't have permission to access this module." />;
    }
  }

  return children;
}
