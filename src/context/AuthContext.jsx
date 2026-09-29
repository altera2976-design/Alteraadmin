import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ems_token'));
  const [user, setUser]   = useState(() => {
    try {
      const stored = localStorage.getItem('ems_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  // loading=true only when a token exists and we're verifying it server-side
  const [loading, setLoading] = useState(() => !!localStorage.getItem('ems_token'));

  // Guard against double-invocation in React StrictMode (dev)
  const sessionRestored = useRef(false);

  // Verify session freshness with backend on mount (lazy init already populated state)
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('ems_token');
      if (!storedToken) {
        // No token — not logged in, nothing to verify
        setLoading(false);
        return;
      }

      try {
        const meRes = await api.get('/auth/me');
        const freshUser = meRes.data?.user || meRes.data;
        if (freshUser) {
          const isSuperEmail =
            freshUser.email?.toLowerCase() === 'admin@alterainterior.com' ||
            freshUser.email?.toLowerCase() === 'admin@company.com';
          const effectiveRole = isSuperEmail ? 'SUPER_ADMIN' : (freshUser.role || 'EMPLOYEE');
          const normalized = { ...freshUser, role: effectiveRole };
          setUser(normalized);
          localStorage.setItem('ems_user', JSON.stringify(normalized));
        }
      } catch (err) {
        // Only force logout on explicit auth rejection (401/403)
        // Network errors / server down: keep cached user so page doesn't flicker
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('ems_token');
          localStorage.removeItem('ems_user');
          setToken(null);
          setUser(null);
        }
        // Any other error (network timeout, 500, etc.) — keep cached state
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    const isSuperAdminEmail = newUser?.email?.toLowerCase() === 'admin@alterainterior.com' || newUser?.email?.toLowerCase() === 'admin@company.com';
    const effectiveRole = isSuperAdminEmail ? 'SUPER_ADMIN' : (newUser?.role || 'EMPLOYEE');
    const normalizedUser = { ...newUser, role: effectiveRole };

    if (effectiveRole === 'EMPLOYEE') {
      throw new Error('Employee accounts are not permitted to access the Admin Panel.');
    }
    if (effectiveRole !== 'SUPER_ADMIN' && newUser?.isAdminPanelEnabled === false) {
      throw new Error('Admin Panel access has not been granted by Super Admin.');
    }

    localStorage.setItem('ems_token', newToken);
    localStorage.setItem('ems_user', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
    return normalizedUser;
  };

  const logout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const resendVerification = async () => {
    const res = await api.post('/auth/resend-verification');
    return res.data;
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'admin@alterainterior.com' || user?.email?.toLowerCase() === 'admin@company.com';

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
