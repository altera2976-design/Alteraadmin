import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('ems_token');
    const storedUser  = localStorage.getItem('ems_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_user');
      }
    }
    setLoading(false);
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
      throw new Error('Admin Panel access has been disabled for your account. Please contact Super Admin.');
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
        isAuthenticated: !!token,
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
