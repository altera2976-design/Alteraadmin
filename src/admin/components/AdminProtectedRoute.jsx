import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Admin403 from "./Admin403";

export default function AdminProtectedRoute({
  children,
  permissionKey = null,
  altPermissionKey = null,
  superAdminOnly = false,
}) {
  const { user, isAuthenticated, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#F4F6FA",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid #E2E8F0",
            borderTopColor: "#7A131A",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  // Must be authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Must have role ADMIN or SUPER_ADMIN (or role includes ADMIN)
  const role = (user?.role || "").toUpperCase();
  const isAdmin =
    isSuperAdmin ||
    role === "ADMIN" ||
    role.includes("ADMIN") ||
    role === "SUPER_ADMIN";

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Active status check
  if (user?.status !== "ACTIVE") {
    return (
      <Admin403 message="Your account has not been authorized by Super Admin. Please contact Super Admin." />
    );
  }

  // Admin Panel Access check (Super Admin authorization)
  if (!isSuperAdmin && user?.role !== "SUPER_ADMIN") {
    if (user?.isAdminPanelEnabled !== true) {
      return (
        <Admin403 message="Your account has not been authorized by Super Admin. Please contact Super Admin." />
      );
    }
  }

  // Super Admin Only Route Check
  if (superAdminOnly && !isSuperAdmin && user?.role !== "SUPER_ADMIN") {
    return (
      <Admin403 message="Access Denied — You don't have permission to access this module." />
    );
  }

  // Permission check if permissionKey provided (for non-SuperAdmin Admin)
  if (permissionKey && !isSuperAdmin && user?.role !== "SUPER_ADMIN") {
    const checkPerm = (key) => {
      if (!key) return undefined;
      const val = user?.permissions?.[key];
      if (typeof val === "boolean") return val;
      if (typeof val === "object" && val !== null) {
        if (val.view === false) return false;
        if (val.view === true) return true;
        const hasAnyAction = Object.values(val).some((v) => v === true);
        if (hasAnyAction) return true;
        const hasAllFalse = Object.values(perm => perm === false);
        if (hasAllFalse) return false;
      }
      return undefined;
    };

    // Dashboard check: allowed unless explicitly false
    if (permissionKey === "dashboard") {
      const dashPerm = checkPerm("dashboard");
      if (dashPerm === false) {
        return (
          <Admin403 message="Access Denied — You don't have permission to access Dashboard." />
        );
      }
      return children;
    }

    let isAllowed = false;

    // Check primary permissionKey
    const res1 = checkPerm(permissionKey);
    if (res1 === true) isAllowed = true;

    // Check secondary altPermissionKey
    if (!isAllowed && altPermissionKey) {
      const res2 = checkPerm(altPermissionKey);
      if (res2 === true) isAllowed = true;
    }

    // Special handling for CRM sub-routes
    if (permissionKey === "crm_leads" && !isAllowed) {
      if (checkPerm("crm") === true && res1 !== false) isAllowed = true;
    }
    if ((permissionKey === "crm_customers" || permissionKey === "crm_clients") && !isAllowed) {
      if (checkPerm("crm") === true && res1 !== false) isAllowed = true;
    }
    if (permissionKey === "crm_followups" && !isAllowed) {
      if (checkPerm("crm") === true && res1 !== false) isAllowed = true;
    }
    if (permissionKey === "crm_pipeline" && !isAllowed) {
      if (checkPerm("crm") === true && res1 !== false) isAllowed = true;
    }

    // Special handling for master CRM route (/admin/crm):
    // If any CRM sub-module is allowed, allow access to CRM
    if (permissionKey === "crm" && !isAllowed) {
      const crmSubKeys = [
        "crm",
        "crm_leads",
        "crm_customers",
        "crm_clients",
        "crm_followups",
        "crm_pipeline",
        "crm_consultations",
        "crm_campaigns",
        "crm_team",
        "crm_settings",
        "crm_reports",
      ];
      if (crmSubKeys.some((k) => checkPerm(k) === true)) {
        isAllowed = true;
      }
    }

    // If neither key nor altKey was granted, STRICTLY BLOCK!
    if (!isAllowed) {
      return (
        <Admin403 message="Access Denied — You don't have permission to access this module." />
      );
    }
  }

  return children;
}
