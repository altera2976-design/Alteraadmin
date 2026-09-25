import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../constants/config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
  timeout: 15000,
});

// Attach JWT token to every request securely from SecureStore
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.log('⚠️ SecureStore access warning during request:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isClearingToken = false;

// Response interceptor to handle token expiration & security errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (!isClearingToken) {
        isClearingToken = true;
        console.log('🔒 [SECURITY] 401 Unauthorized received. Clearing expired session token...');
        try {
          await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN).catch(() => {});
          await SecureStore.deleteItemAsync(STORAGE_KEYS.USER).catch(() => {});
        } catch (err) {
          console.error('Failed to wipe SecureStore on 401:', err);
        } finally {
          setTimeout(() => {
            isClearingToken = false;
          }, 3000);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
