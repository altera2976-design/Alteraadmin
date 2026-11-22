import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../services/api';

const ConfigContext = createContext(null);

const CACHE_KEY = 'ems_app_config';

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!config);
  const [socketConnected, setSocketConnected] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);

  // Fetch active configuration from backend
  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/app-config');
      if (res.data?.success && res.data?.data) {
        const freshConfig = res.data.data;
        setConfig(freshConfig);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(freshConfig));
        } catch {
          // ignore localStorage quota
        }
      }
    } catch (err) {
      console.warn('⚠️ [ConfigContext] Failed to fetch app-config:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize and connect Socket.IO
  useEffect(() => {
    fetchConfig();

    let socket;
    try {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 20,
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        console.log('🔌 [Socket.IO] Connected to synchronization server:', socket.id);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
        console.log('🔌 [Socket.IO] Disconnected from synchronization server');
      });

      // Realtime application configuration update (Navigation, Forms, Tables, Theme)
      socket.on('app_config_updated', (payload) => {
        console.log('📡 [ConfigContext] Received live app_config_updated:', payload);
        if (payload?.config) {
          setConfig((prev) => {
            const next = {
              ...(prev || {}),
              ...payload.config,
              version: payload.version,
            };
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });

          setSyncHistory((prev) => [
            {
              id: Date.now(),
              type: payload.type,
              version: payload.version,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 19),
          ]);
        }
      });

      // Realtime data entity update (Offer Letters, Salary, Payroll, Attendance, Employee)
      const handleEntityChange = (eventPayload) => {
        console.log('📡 [ConfigContext] Live entity change:', eventPayload);
        // Dispatch window event so currently mounted pages can immediately refetch their tables
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ems_entity_changed', { detail: eventPayload })
          );
        }
      };

      socket.on('entity_changed', handleEntityChange);
      socket.on('attendance_changed', (data) => handleEntityChange({ entity: 'attendance', ...data }));
      socket.on('payroll_changed', (data) => handleEntityChange({ entity: 'payroll', ...data }));
      socket.on('salary_changed', (data) => handleEntityChange({ entity: 'salary', ...data }));
      socket.on('offer_letter_changed', (data) => handleEntityChange({ entity: 'offer_letter', ...data }));
      socket.on('employee_changed', (data) => handleEntityChange({ entity: 'employee', ...data }));
      socket.on('employee_updated', (data) => handleEntityChange({ entity: 'employee', ...data }));

    } catch (socketErr) {
      console.warn('⚠️ [ConfigContext] Socket connection error:', socketErr.message);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [fetchConfig]);

  // Update modules / navigation (Admin / Super Admin action)
  const updateModules = async (modulesList) => {
    try {
      const res = await api.put('/app-config/modules', { modules: modulesList });
      if (res.data?.success) {
        await fetchConfig();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Failed to update modules' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  // Update dynamic form schema
  const updateFormSchema = async (formKey, fields) => {
    try {
      const res = await api.put('/app-config/forms', { formKey, fields });
      if (res.data?.success) {
        await fetchConfig();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Failed to update form schema' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  // Update dynamic table schema
  const updateTableSchema = async (tableKey, columns) => {
    try {
      const res = await api.put('/app-config/tables', { tableKey, columns });
      if (res.data?.success) {
        await fetchConfig();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Failed to update table schema' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  // Update system settings & operational preferences
  const updateSystemSettings = async (settings) => {
    try {
      const res = await api.put('/app-config/settings', { systemSettings: settings });
      if (res.data?.success) {
        await fetchConfig();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Failed to update settings' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  // Manually trigger a synchronization broadcast for an entity
  const triggerSync = async (entity, action, data = null) => {
    try {
      const res = await api.post('/app-config/sync-trigger', { entity, action, data });
      return res.data;
    } catch (err) {
      console.warn('⚠️ triggerSync failed:', err.message);
      return { success: false };
    }
  };

  // Helper to get active modules for the current panel (web / mobile)
  const getVisibleModules = useCallback(
    (target = 'web') => {
      if (!config?.modules) return [];
      return config.modules.filter((m) => {
        if (!m.enabled) return false;
        if (target === 'web' && m.webVisible === false) return false;
        if (target === 'mobile' && m.mobileVisible === false) return false;
        return true;
      });
    },
    [config]
  );

  const value = {
    config,
    modules: config?.modules || [],
    formSchemas: config?.formSchemas || {},
    tableSchemas: config?.tableSchemas || {},
    systemSettings: config?.systemSettings || {},
    version: config?.version || 1,
    loading,
    socketConnected,
    syncHistory,
    refreshConfig: fetchConfig,
    updateModules,
    updateFormSchema,
    updateTableSchema,
    updateSystemSettings,
    triggerSync,
    getVisibleModules,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
