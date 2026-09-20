import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { STORAGE_KEYS } from "../constants/config";
import { authService, User } from "../services/authService";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
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

function normalizeUser(u: User | null): User | null {
  if (!u) return null;
  if (
    u.email?.toLowerCase() === "admin@company.com" ||
    (u as any).role === "SUPER_ADMIN"
  ) {
    return { ...u, role: "ADMIN" };
  }
  return u;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
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
          setUser(normalizeUser(JSON.parse(storedUser)));
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
    const normalized = normalizeUser(response.user)!;
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, response.token);
    await SecureStore.setItemAsync(
      STORAGE_KEYS.USER,
      JSON.stringify(normalized),
    );
    setToken(response.token);
    setUser(normalized);
  };

  const googleLogin = async (idToken: string) => {
    const response = await authService.googleLogin(idToken);
    if (response.token && response.user) {
      const normalized = normalizeUser(response.user)!;
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, response.token);
      await SecureStore.setItemAsync(
        STORAGE_KEYS.USER,
        JSON.stringify(normalized),
      );
      setToken(response.token);
      setUser(normalized);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const response = await authService.register(data);
    if (response.token && response.user) {
      const normalized = normalizeUser(response.user)!;
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, response.token);
      await SecureStore.setItemAsync(
        STORAGE_KEYS.USER,
        JSON.stringify(normalized),
      );
      setToken(response.token);
      setUser(normalized);
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
    const normalized = normalizeUser(updatedUser)!;
    await SecureStore.setItemAsync(
      STORAGE_KEYS.USER,
      JSON.stringify(normalized),
    );
    setUser(normalized);
    return normalized;
  };

  const setSession = async (newToken: string, newUser: User) => {
    const normalized = normalizeUser(newUser)!;
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, newToken);
    await SecureStore.setItemAsync(
      STORAGE_KEYS.USER,
      JSON.stringify(normalized),
    );
    setToken(newToken);
    setUser(normalized);
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
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        googleLogin,
        register,
        logout,
        setSession,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
