import axios from "axios";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.endsWith(".local"));

const API_URL = import.meta.env.VITE_API_URL || "https://alterabackend.onrender.com/api";

export const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace("/api", "") 
  : "https://alterabackend.onrender.com";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── Request interceptor: attach JWT token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const isAuthRoute =
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/register") ||
      config.url?.includes("/auth/forgot-password") ||
      config.url?.includes("/auth/reset-password") ||
      config.url?.includes("/auth/google");
    if (!isAuthRoute) {
      const token = localStorage.getItem("ems_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // CRITICAL: Let browser set Content-Type and boundary automatically for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 (token expired / invalid) ───────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ems_token");
      localStorage.removeItem("ems_user");
      if (!window.location.pathname.includes('/login')) {
        window.location.href = window.location.pathname.startsWith('/admin')
          ? '/admin/login'
          : '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

