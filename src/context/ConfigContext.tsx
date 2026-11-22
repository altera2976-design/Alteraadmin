import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export interface AppModuleConfig {
  key: string;
  label: string;
  icon?: string;
  category?: string;
  webRoute?: string;
  mobileRoute?: string;
  webVisible?: boolean;
  mobileVisible?: boolean;
  enabled?: boolean;
  allowedRoles?: string[];
  sortOrder?: number;
}

export interface AppConfig {
  version?: number;
  appName?: string;
  modules?: AppModuleConfig[];
  systemSettings?: Record<string, any>;
  formSchemas?: Record<string, any>;
  tableSchemas?: Record<string, any>;
}

interface ConfigContextValue {
  config: AppConfig | null;
  modules: AppModuleConfig[];
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

const CACHE_KEY = '@ems_app_config';

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/app-config');
      if (res.data?.success && res.data?.data) {
        const fresh = res.data.data;
        setConfig(fresh);
        await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(fresh));
      }
    } catch (err: any) {
      console.log('⚠️ [ConfigContext] Failed to fetch app-config:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await SecureStore.getItemAsync(CACHE_KEY);
        if (cached) {
          setConfig(JSON.parse(cached));
          setLoading(false);
        }
      } catch {
        // ignore
      }
      fetchConfig();
    })();
  }, [fetchConfig]);

  const value: ConfigContextValue = {
    config,
    modules: config?.modules || [],
    loading,
    refreshConfig: fetchConfig,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
