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

export const DEFAULT_MODULES: AppModuleConfig[] = [
  { key: "dashboard", label: "Dashboard", icon: "grid-outline", mobileRoute: "/(app)/tabs/dashboard", enabled: true, mobileVisible: true },
  { key: "crm", label: "CRM", icon: "people-outline", mobileRoute: "/(app)/tabs/crm", enabled: true, mobileVisible: true, allowedRoles: ["ADMIN", "SUPER_ADMIN"] },
  { key: "projects", label: "Projects", icon: "briefcase-outline", mobileRoute: "/(app)/tabs/projects", enabled: true, mobileVisible: true },
  { key: "salary", label: "Salary", icon: "cash-outline", mobileRoute: "/(app)/salary", enabled: true, mobileVisible: true },
  { key: "attendance", label: "Attendance", icon: "calendar-outline", mobileRoute: "/(app)/attendance", enabled: true, mobileVisible: true },
  { key: "bikeTracking", label: "Bike Tracking", icon: "bicycle-outline", mobileRoute: "/(app)/tabs/bike", enabled: true, mobileVisible: true },
  { key: "quotation", label: "Quotation", icon: "document-text-outline", mobileRoute: "/(app)/quotation", enabled: true, mobileVisible: true, allowedRoles: ["ADMIN", "SUPER_ADMIN"] },
  { key: "transactions", label: "Transactions", icon: "card-outline", mobileRoute: "/(app)/transactions", enabled: true, mobileVisible: true, allowedRoles: ["ADMIN", "SUPER_ADMIN"] },
  { key: "reports", label: "Reports", icon: "stats-chart-outline", mobileRoute: "/(app)/tabs/reports", enabled: true, mobileVisible: true, allowedRoles: ["ADMIN", "SUPER_ADMIN"] },
  { key: "settings", label: "Settings", icon: "settings-outline", mobileRoute: "/(app)/tabs/profile", enabled: true, mobileVisible: true },
];

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
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/app-config');
      if (res.data?.success && res.data?.data) {
        const fresh = res.data.data;
        setConfig(fresh);
        await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(fresh));
      }
    } catch {
      // Quiet fallback to default / cached modules during initial boot
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
        }
      } catch {
        // ignore
      }
      fetchConfig();
    })();
  }, [fetchConfig]);

  const value: ConfigContextValue = {
    config,
    modules: config?.modules && config.modules.length > 0 ? config.modules : DEFAULT_MODULES,
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
