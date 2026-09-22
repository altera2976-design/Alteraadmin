import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ADMIN_NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", key: "dashboard" },
  { to: "/admin/employees", label: "Employees", key: "employees", altKey: "administration" },
  { to: "/admin/attendance", label: "Attendance", key: "attendance" },
  { to: "/admin/payroll", label: "Payroll", key: "payroll", altKey: "salary" },
  { to: "/admin/bike-tracking", label: "Bike Tracking", key: "tracking" },
  { to: "/admin/crm", label: "CRM", key: "crm" },
  { to: "/admin/transactions", label: "Transactions", key: "transactions" },
  { to: "/admin/quotations", label: "Quotations", key: "quotations", altKey: "quotation" },
  { to: "/admin/offer-letters", label: "Offer Letters", key: "offer_letters", altKey: "offerLetters" },
  { to: "/admin/reports", label: "Reports", key: "reports" },
  { to: "/admin/notifications", label: "Notifications", key: "notifications" },
  { to: "/admin/profile", label: "Profile", key: "profile" },
  { to: "/admin/settings", label: "Settings", key: "settings", altKey: "administration" },
];

export default function AdminAppLayout({ children, title = "Admin Dashboard" }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isTablet = windowWidth >= 768 && windowWidth < 1200;
  const isMobile = windowWidth < 768;
  const isCompactTablet = isTablet && !tabletExpanded;

  const hasPermission = (item) => {
    if (isSuperAdmin || user?.role === 'SUPER_ADMIN') return true;
    if (!user?.permissions || Object.keys(user.permissions).length === 0) return true;

    const key = item.key;
    const altKey = item.altKey;

    const checkKey = (k) => {
      if (!k) return undefined;
      const perm = user.permissions[k];
      if (typeof perm === 'boolean') return perm;
      if (typeof perm === 'object' && perm !== null) {
        if (perm.view === false) return false;
        if (perm.view === true) return true;
        const hasAnyAction = Object.values(perm).some((v) => v === true);
        if (hasAnyAction) return true;
        const hasAllFalse = Object.values(perm).every((v) => v === false);
        if (hasAllFalse) return false;
      }
      return undefined;
    };

    const res1 = checkKey(key);
    if (res1 !== undefined) return res1;
    const res2 = checkKey(altKey);
    if (res2 !== undefined) return res2;
    return true;
  };

  const filteredNavItems = ADMIN_NAV_ITEMS.filter(hasPermission);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out from Admin Portal?")) {
      logout();
      navigate('/admin/login');
    }
  };

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const toggleHamburger = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else if (isTablet) {
      setTabletExpanded(!tabletExpanded);
    }
  };

  const closeMobileDrawer = () => {
    if (isMobile) setMobileDrawerOpen(false);
  };

  return (
    <div style={styles.root}>
      {isMobile && mobileDrawerOpen && (
        <div style={styles.overlay} onClick={closeMobileDrawer} />
      )}

      {/* Sidebar matching Super Admin EXACT colors & branding */}
      <aside
        style={{
          ...styles.sidebar,
          ...(isCompactTablet ? styles.sidebarCompact : {}),
          ...(isMobile
            ? {
                ...styles.sidebarMobile,
                transform: mobileDrawerOpen ? "translateX(0)" : "translateX(-100%)",
              }
            : {}),
        }}
      >
        {/* Brand Header */}
        <div style={{ ...styles.sidebarLogo, ...(isCompactTablet ? styles.sidebarLogoCompact : {}) }}>
          <div style={styles.logoBadge}>
            <img
              src="/logo-circle.png"
              alt="Altera Interior"
              style={styles.logoImg}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          {!isCompactTablet && (
            <div style={styles.logoTextWrap}>
              <div style={styles.logoTitle}>Altera Interior</div>
              <div style={styles.logoSub}>LUXURY INTERIORS • CRM</div>
            </div>
          )}
        </div>

        {!isCompactTablet && (
          <div style={styles.navSectionLabel}>MANAGEMENT CONSOLE</div>
        )}

        <nav style={{ ...styles.nav, ...(isCompactTablet ? { padding: "12px 6px" } : {}) }}>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCompactTablet ? item.label : undefined}
              onClick={closeMobileDrawer}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
                ...(isCompactTablet ? styles.navLinkCompact : {}),
              })}
            >
              {!isCompactTablet && <span style={styles.navLabel}>{item.label}</span>}
              {isCompactTablet && <span style={styles.navLabel}>{item.label.slice(0, 3)}</span>}
            </NavLink>
          ))}

          <button
            onClick={() => {
              closeMobileDrawer();
              handleLogout();
            }}
            title={isCompactTablet ? "Sign Out" : undefined}
            style={{
              ...styles.navLink,
              ...(isCompactTablet ? styles.navLinkCompact : {}),
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: isCompactTablet ? "center" : "left",
              cursor: "pointer",
              marginTop: 6,
            }}
          >
            {!isCompactTablet && <span style={styles.navLabel}>Logout</span>}
            {isCompactTablet && <span style={styles.navLabel}>Out</span>}
          </button>
        </nav>

        <div style={{ ...styles.sidebarFooter, ...(isCompactTablet ? styles.sidebarFooterCompact : {}) }}>
          <div style={{ ...styles.userInfo, ...(isCompactTablet ? { justifyContent: "center" } : {}) }}>
            {!isCompactTablet && (
              <div style={styles.userDetails}>
                <div style={styles.userName}>{user?.name || "Administrator"}</div>
                <div style={styles.userRole}>
                  <span style={styles.roleDot} />
                  {user?.role || "ADMIN"}
                </div>
              </div>
            )}
          </div>
          {!isCompactTablet && (
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              style={styles.hamburger}
              onClick={toggleHamburger}
              aria-label="Toggle navigation"
            >
              Menu
            </button>
            <div>
              <div style={styles.headerBreadcrumb}>
                Altera Interior • Management Portal
              </div>
              <h1 style={styles.pageTitle}>{title}</h1>
            </div>
          </div>

          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search leads, clients, quotations, team..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.headerRight}>
            <div style={styles.dateBadge}>
              <span>{todayFormatted}</span>
            </div>

            <div style={styles.userPill}>
              <div style={styles.userPillInfo}>
                <span style={styles.userPillName}>{user?.name || "Admin"}</span>
                <span style={styles.userPillStatus}>Online</span>
              </div>
            </div>
          </div>
        </header>

        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#F8F6F2",
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    overflowX: "hidden",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(18, 19, 22, 0.65)",
    backdropFilter: "blur(4px)",
    zIndex: 999,
  },
  sidebar: {
    width: 250,
    minHeight: "100vh",
    background: "#121316",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
    zIndex: 100,
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.25)",
    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  sidebarCompact: { width: 72 },
  sidebarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: 270,
    maxWidth: "85vw",
    zIndex: 1000,
    boxShadow: "4px 0 28px rgba(0, 0, 0, 0.4)",
    paddingBottom: "max(16px, env(safe-area-inset-bottom))",
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "24px 20px 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
  },
  sidebarLogoCompact: { padding: "20px 10px", justifyContent: "center" },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, rgba(159, 11, 34, 0.25) 0%, rgba(200, 16, 46, 0.15) 100%)",
    border: "1px solid rgba(200, 16, 46, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
  },
  logoImg: { width: 32, height: 32, objectFit: "contain" },
  logoTextWrap: { minWidth: 0 },
  logoTitle: { color: "#FFFFFF", fontWeight: 800, fontSize: 16, letterSpacing: "0.02em", fontFamily: "'Outfit', sans-serif" },
  logoSub: { color: "#C5A059", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", marginTop: 2 },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#5C606C",
    padding: "16px 20px 6px",
    textTransform: "uppercase",
  },
  nav: { flex: 1, padding: "4px 10px 16px", display: "flex", flexDirection: "column", gap: 4 },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    color: "#9EA2AE",
    fontWeight: 500,
    fontSize: 13.5,
    borderRadius: 10,
    textDecoration: "none",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    position: "relative",
  },
  navLinkCompact: { justifyContent: "center", padding: "12px 10px" },
  navLinkActive: {
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #9F0B22 0%, #C8102E 100%)",
    fontWeight: 600,
    boxShadow: "0 6px 18px rgba(159, 11, 34, 0.35)",
  },
  navLabel: { flex: 1 },
  sidebarFooter: {
    padding: "16px 14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.07)",
    background: "#0E0F12",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sidebarFooterCompact: { padding: "14px 8px", alignItems: "center" },
  userInfo: { display: "flex", alignItems: "center", gap: 10 },
  userDetails: { minWidth: 0, flex: 1 },
  userName: { color: "#FFFFFF", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { color: "#9EA2AE", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 5, marginTop: 1 },
  roleDot: { width: 6, height: 6, borderRadius: "50%", background: "#10B981" },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "9px 12px",
    background: "rgba(159, 11, 34, 0.12)",
    color: "#FF8A98",
    border: "1px solid rgba(159, 11, 34, 0.25)",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "0 28px",
    height: 70,
    background: "#FFFFFF",
    borderBottom: "1px solid #E8E3DA",
    boxShadow: "0 2px 10px rgba(28, 20, 16, 0.03)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  hamburger: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    color: "#4F4A42",
    padding: "6px 12px",
    borderRadius: 8,
    background: "#FAF8F5",
    border: "1px solid #E8E3DA",
  },
  headerBreadcrumb: { fontSize: 11, fontWeight: 600, color: "#9E978C", letterSpacing: "0.02em" },
  pageTitle: { fontSize: 18, fontWeight: 800, color: "#1A1A1E", fontFamily: "'Outfit', sans-serif", lineHeight: 1.2 },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#FAF8F5",
    border: "1px solid #E8E3DA",
    borderRadius: 10,
    padding: "8px 14px",
    width: 320,
    maxWidth: "100%",
  },
  searchInput: { border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#201E1A", width: "100%", fontFamily: "inherit" },
  headerRight: { display: "flex", alignItems: "center", gap: 14 },
  dateBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#FAF8F5",
    border: "1px solid #E8E3DA",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#6F6960",
  },
  userPill: {
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    background: "#FAF8F5",
    border: "1px solid #E8E3DA",
    borderRadius: 20,
  },
  userPillInfo: { display: "flex", flexDirection: "column", lineHeight: 1.1 },
  userPillName: { fontSize: 12.5, fontWeight: 700, color: "#1A1A1E" },
  userPillStatus: { fontSize: 10, fontWeight: 600, color: "#10B981" },
  content: { flex: 1, padding: "28px", maxWidth: 1380, width: "100%", margin: "0 auto" },
};
