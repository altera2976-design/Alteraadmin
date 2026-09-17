import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService, User } from '../services/authService';
import { STORAGE_KEYS } from '../constants/config';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    email?: string;
    department?: string;
    designation?: string;
  }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  // Restore session from SecureStore on app launch
  useEffect(() => {
    const restore = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.USER),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // Clear corrupted data
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN).catch(() => {});
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER).catch(() => {});
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, response.token);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  };

  const googleLogin = async (idToken: string) => {
    const response = await authService.googleLogin(idToken);
    if (response.token && response.user) {
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, response.token);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
    }
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string }) => {
    const response = await authService.register(data);
    if (response.token && response.user) {
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, response.token);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
    }
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    email?: string;
    department?: string;
    designation?: string;
  }) => {
    const updatedUser = await authService.updateProfile(data);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  };

  const setSession = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, newToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, googleLogin, register, logout, setSession, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
