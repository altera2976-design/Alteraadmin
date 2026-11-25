import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../services/api';

const AuthContext = createContext(null);

export const getActivePortalKeys = (pathname = typeof window !== 'undefined' ? window.location.pathname : '') => {
  const isAdmin = (pathname || '').startsWith('/admin');
  return {
    isAdmin,
    tokenKey: isAdmin ? 'ems_admin_token' : 'ems_super_token',
    userKey: isAdmin ? 'ems_admin_user' : 'ems_super_user',
  };
};

const getStoredToken = (pathname) => {
  const { isAdmin, tokenKey } = getActivePortalKeys(pathname);
  const token = localStorage.getItem(tokenKey);
  if (token) return token;

  // Fallback to legacy ems_token if role aligns with portal
  const legacyToken = localStorage.getItem('ems_token');
  if (legacyToken) {
    try {
      const legacyUser = JSON.parse(localStorage.getItem('ems_user') || '{}');
      const isSuper =
        legacyUser.role === 'SUPER_ADMIN' ||
        legacyUser.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com';
      if (isAdmin && !isSuper) return legacyToken;
      if (!isAdmin && isSuper) return legacyToken;
    } catch {
      // ignore
    }
  }
  return null;
};

const getStoredUser = (pathname) => {
  const { isAdmin, userKey } = getActivePortalKeys(pathname);
  try {
    const stored = localStorage.getItem(userKey);
    if (stored) return JSON.parse(stored);

    // Fallback to legacy ems_user if role aligns with portal
    const legacyStr = localStorage.getItem('ems_user');
    if (legacyStr) {
      const legacyUser = JSON.parse(legacyStr);
      const isSuper =
        legacyUser.role === 'SUPER_ADMIN' ||
        legacyUser.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com';
      if (isAdmin && !isSuper) return legacyUser;
      if (!isAdmin && isSuper) return legacyUser;
    }
  } catch {
    return null;
  }
  return null;
};

export function AuthProvider({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const [token, setToken] = useState(() => getStoredToken(typeof window !== 'undefined' ? window.location.pathname : ''));
  const [user, setUser]   = useState(() => getStoredUser(typeof window !== 'undefined' ? window.location.pathname : ''));
  const [loading, setLoading] = useState(() => !!getStoredToken(typeof window !== 'undefined' ? window.location.pathname : ''));

  // Sync state whenever portal path changes (e.g. navigation from /admin to /super-admin or vice-versa)
  useEffect(() => {
    const portalToken = getStoredToken(currentPath);
    const portalUser = getStoredUser(currentPath);
    setToken(portalToken);
    setUser(portalUser);
  }, [currentPath]);

  // Guard against double-invocation in React StrictMode (dev)
  const sessionRestored = useRef(false);

  // Verify session freshness with backend on mount
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;

    const verifySession = async () => {
      const targetPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const storedToken = getStoredToken(targetPath);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const meRes = await api.get('/auth/me');
        const freshUser = meRes.data?.user || meRes.data;
        if (freshUser) {
          const isSuperEmail =
            freshUser.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com';
          const effectiveRole = isSuperEmail ? 'SUPER_ADMIN' : (freshUser.role || 'EMPLOYEE');
          const normalized = { ...freshUser, role: effectiveRole };
          const { userKey } = getActivePortalKeys(targetPath);
          localStorage.setItem(userKey, JSON.stringify(normalized));
          setUser(normalized);
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          const { tokenKey, userKey } = getActivePortalKeys(targetPath);
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userKey);
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (email, password, portalScope = null) => {
    const targetPath = portalScope || (typeof window !== 'undefined' ? window.location.pathname : '');
    const { isAdmin, tokenKey, userKey } = getActivePortalKeys(targetPath);

    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    const isSuperAdminEmail =
      newUser?.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com';
    const effectiveRole = isSuperAdminEmail ? 'SUPER_ADMIN' : (newUser?.role || 'EMPLOYEE');
    const normalizedUser = { ...newUser, role: effectiveRole };

    if (effectiveRole === 'EMPLOYEE') {
      throw new Error('Employee accounts are not permitted to access the Admin Panel.');
    }
    if (effectiveRole !== 'SUPER_ADMIN') {
      if (newUser?.isAdminPanelEnabled !== true || newUser?.status !== 'ACTIVE') {
        throw new Error('Your account has not been authorized by Super Admin. Please contact Super Admin.');
      }
    }

    // Save strictly to the designated portal storage
    localStorage.setItem(tokenKey, newToken);
    localStorage.setItem(userKey, JSON.stringify(normalizedUser));

    // Only mirror to legacy keys if Super Admin is logging in on Super Admin portal
    if (!isAdmin && effectiveRole === 'SUPER_ADMIN') {
      localStorage.setItem('ems_token', newToken);
      localStorage.setItem('ems_user', JSON.stringify(normalizedUser));
    }

    setToken(newToken);
    setUser(normalizedUser);
    return normalizedUser;
  };

  const logout = (redirectPath) => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const { isAdmin, tokenKey, userKey } = getActivePortalKeys(currentPath);

    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);

    if (!isAdmin) {
      localStorage.removeItem('ems_token');
      localStorage.removeItem('ems_user');
    }

    setToken(null);
    setUser(null);
    window.location.href = redirectPath || (isAdmin ? '/admin/login' : '/super-admin/login');
  };

  const resendVerification = async () => {
    const res = await api.post('/auth/resend-verification');
    return res.data;
  };

  const refreshUser = useCallback(async (pathOverride) => {
    const targetPath = pathOverride || (typeof window !== 'undefined' ? window.location.pathname : '');
    const storedToken = getStoredToken(targetPath);
    if (!storedToken) return null;
    try {
      const meRes = await api.get('/auth/me');
      const freshUser = meRes.data?.user || meRes.data;
      if (freshUser) {
        const isSuperEmail =
          freshUser.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com';
        const effectiveRole = isSuperEmail ? 'SUPER_ADMIN' : (freshUser.role || 'EMPLOYEE');
        const normalized = { ...freshUser, role: effectiveRole };
        const { userKey } = getActivePortalKeys(targetPath);
        localStorage.setItem(userKey, JSON.stringify(normalized));
        setUser(normalized);
        return normalized;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Real-time synchronization of permissions from Super Admin
  useEffect(() => {
    if (!user?._id) return;

    let socket;
    try {
      socket = io(SOCKET_URL, { autoConnect: true });
      socket.on('employee_permissions_updated', (data) => {
        if (data && (data.employeeId === user._id || data.employee?._id === user._id)) {
          refreshUser();
        }
      });
      socket.on('employee_updated', (data) => {
        if (data && (data.employee?._id === user._id || data.userId === user._id)) {
          refreshUser();
        }
      });
    } catch (err) {
      console.warn('AuthContext socket sync warning:', err);
    }

    // Tab focus check: re-sync permissions only for current tab's active portal
    const handleFocus = () => {
      refreshUser();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (socket) socket.disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?._id, refreshUser]);

  const isSuperAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.email?.toLowerCase() === 'alterakitcheninteriorr@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: isSuperAdmin || user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'MANAGER',
        isSuperAdmin,
        login,
        logout,
        refreshUser,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
