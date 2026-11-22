import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { getSocket } from '../services/socket';

export interface MobileModuleItem {
  id: string;
  label: string;
  icon?: string;
  emoji?: string;
  webPath?: string;
  mobileRoute?: string;
  allowedRoles?: string[];
  enabled?: boolean;
  mobileVisible?: boolean;
  order?: number;
}

export interface SystemSettings {
  companyName?: string;
  themePrimaryColor?: string;
  workingDaysPerMonth?: number;
  standardShiftHours?: number;
  emailAlerts?: boolean;
  autoApproveLeaves?: boolean;
  enableRealtimeSync?: boolean;
}

export interface ConfigContextType {
  modules: MobileModuleItem[];
  formSchemas: Record<string, any[]>;
  tableSchemas: Record<string, any[]>;
  systemSettings: SystemSettings;
  version: number;
  isLoading: boolean;
  socketConnected: boolean;
  refreshConfig: () => Promise<void>;
  getMobileModules: () => MobileModuleItem[];
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const CONFIG_CACHE_KEY = 'ems_mobile_app_config';

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<MobileModuleItem[]>([]);
  const [formSchemas, setFormSchemas] = useState<Record<string, any[]>>({});
  const [tableSchemas, setTableSchemas] = useState<Record<string, any[]>>({});
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    companyName: 'Altera Design Studio',
    themePrimaryColor: '#7A131A',
    workingDaysPerMonth: 26,
    standardShiftHours: 8,
  });
  const [version, setVersion] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  // Load cached configuration on mobile startup
  useEffect(() => {
    (async () => {
      try {
        const cached = await SecureStore.getItemAsync(CONFIG_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.modules) setModules(parsed.modules);
          if (parsed.formSchemas) setFormSchemas(parsed.formSchemas);
          if (parsed.tableSchemas) setTableSchemas(parsed.tableSchemas);
          if (parsed.systemSettings) setSystemSettings(parsed.systemSettings);
          if (parsed.version) setVersion(parsed.version);
        }
      } catch (err) {
        console.warn('⚠️ [ConfigContext] Failed to load cached config:', err);
      }
    })();
  }, []);

  // Fetch fresh config from backend API
  const refreshConfig = useCallback(async () => {
    try {
      const res = await api.get('/app-config');
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (data.modules) setModules(data.modules);
        if (data.formSchemas) setFormSchemas(data.formSchemas);
        if (data.tableSchemas) setTableSchemas(data.tableSchemas);
        if (data.systemSettings) setSystemSettings(data.systemSettings);
        if (data.version) setVersion(data.version);

        try {
          await SecureStore.setItemAsync(CONFIG_CACHE_KEY, JSON.stringify(data));
        } catch {
          // ignore cache write error
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [ConfigContext] Failed to fetch /app-config:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect Socket.IO for real-time synchronization
  useEffect(() => {
    refreshConfig();

    const socket = getSocket();
    if (!socket) return;

    if (socket.connected) {
      setSocketConnected(true);
    }

    const onConnect = () => {
      setSocketConnected(true);
      console.log('🔌 [Mobile Socket.IO] Connected to backend synchronization engine');
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    // Realtime configuration update event broadcasted from Dashboard
    const onConfigUpdated = (payload: any) => {
      console.log('📡 [Mobile Socket.IO] Live config updated:', payload?.type, 'v=' + payload?.version);
      if (payload?.config) {
        const cfg = payload.config;
        if (cfg.modules) setModules(cfg.modules);
        if (cfg.formSchemas) setFormSchemas(cfg.formSchemas);
        if (cfg.tableSchemas) setTableSchemas(cfg.tableSchemas);
        if (cfg.systemSettings) setSystemSettings(cfg.systemSettings);
        if (payload.version) setVersion(payload.version);

        try {
          SecureStore.setItemAsync(CONFIG_CACHE_KEY, JSON.stringify(cfg));
        } catch {
          // ignore
        }
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('app_config_updated', onConfigUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('app_config_updated', onConfigUpdated);
    };
  }, [refreshConfig]);

  // Filter modules visible to mobile screens
  const getMobileModules = useCallback(() => {
    if (!modules || modules.length === 0) return [];
    return modules.filter((m) => m.enabled !== false && m.mobileVisible !== false);
  }, [modules]);

  const value: ConfigContextType = {
    modules,
    formSchemas,
    tableSchemas,
    systemSettings,
    version,
    isLoading,
    socketConnected,
    refreshConfig,
    getMobileModules,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
