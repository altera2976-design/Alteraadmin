import api from './api';
import { API_URL } from '../constants/config';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/config';

export interface AttendanceRecord {
  _id: string;
  userId: any;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  checkInSelfie?: string;
  checkOutSelfie?: string;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    distance?: number;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    distance?: number;
  };
  verificationStatus?: 'VERIFIED' | 'REVIEW_REQUIRED' | 'FAILED';
  livenessStatus?: 'VERIFIED' | 'NOT_AVAILABLE' | 'SUSPICIOUS';
  geofenceStatus?: 'INSIDE' | 'OUTSIDE' | 'DISABLED';
  totalHours?: number;
  reviewNotes?: string;
  distance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyEmployeeAttendance {
  _id: string;
  name: string;
  employeeId?: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  attendanceId: string | null;
  checkInSelfie: string | null;
  checkOutSelfie: string | null;
  verificationStatus: string | null;
  livenessStatus: string | null;
  geofenceStatus: string | null;
  checkInLocation: any;
  checkOutLocation: any;
  distance: number | null;
  totalHours: number | null;
  reviewNotes: string | null;
}

export interface GeofenceConfig {
  geofenceMode: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
  officeName: string;
  officeAddress: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export const attendanceApi = {
  // ── EMPLOYEE SELFIE ATTENDANCE ─────────────────────────────────────────────
  markSelfieAttendance: async (payload: {
    type: 'CHECK_IN' | 'CHECK_OUT';
    selfieBase64: string;
    latitude: number;
    longitude: number;
    address?: string;
    clientTimestamp?: string;
    projectId?: string;
    projectName?: string;
  }) => {
    const response = await api.post('/attendance/selfie-mark', payload);
    return response.data;
  },

  getTodayAttendance: async (): Promise<{ success: boolean; attendance: AttendanceRecord | null }> => {
    const response = await api.get('/attendance/today');
    return response.data;
  },

  getMyHistory: async (): Promise<{ success: boolean; history: AttendanceRecord[] }> => {
    const response = await api.get('/attendance/history');
    return response.data;
  },

  getMonthlyStats: async (month: string) => {
    const response = await api.get(`/attendance/monthly?month=${month}`);
    return response.data;
  },

  // ── ADMIN SUITE ────────────────────────────────────────────────────────────
  getAdminStats: async () => {
    const response = await api.get('/attendance/admin/stats');
    return response.data;
  },

  getDailyAttendanceList: async (date?: string): Promise<{ success: boolean; date: string; list: DailyEmployeeAttendance[] }> => {
    const response = await api.get(`/attendance/admin/daily-list${date ? `?date=${date}` : ''}`);
    return response.data;
  },

  reviewAttendance: async (
    id: string,
    payload: { verificationStatus?: string; status?: string; reviewNotes?: string }
  ) => {
    const response = await api.patch(`/attendance/review/${id}`, payload);
    return response.data;
  },

  getGeofenceConfig: async (): Promise<{ success: boolean; data: GeofenceConfig }> => {
    const response = await api.get('/attendance/geofence-config');
    return response.data;
  },

  updateGeofenceConfig: async (config: Partial<GeofenceConfig>): Promise<{ success: boolean; message: string; data: GeofenceConfig }> => {
    const response = await api.put('/attendance/geofence-config', config);
    return response.data;
  },

  // ── SECURE IMAGE HELPERS ───────────────────────────────────────────────────
  getSelfieUrl: (attendanceId: string, type: 'checkin' | 'checkout'): string => {
    return `${API_URL}/attendance/selfie/${attendanceId}/${type}`;
  },

  getAuthHeaders: async (): Promise<{ Authorization?: string }> => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Backwards compatibility for QR
  scanQr: async (token: string, location?: { latitude: number; longitude: number; address?: string }) => {
    const response = await api.post('/attendance/scan', { token, location });
    return response.data;
  },

  generateQr: async () => {
    const response = await api.post('/attendance/generate-qr', {});
    return response.data;
  },
};
