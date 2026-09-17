import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * API Configuration
 * 
 * For Production / Client APKs:
 * Ensure that EXPO_PUBLIC_API_URL is set in your .env file or build environment.
 * Do NOT use localhost or 192.168.x.x for production builds.
 */
const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
let apiUrl = process.env.EXPO_PUBLIC_API_URL || extraApiUrl || 'http://192.168.1.52:5001/api';

// For local development only
if (__DEV__) {
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
    apiUrl = process.env.EXPO_PUBLIC_API_URL || `http://${host}:5001/api`;
  } else {
    // If Expo Go provides a specific hostUri, use that instead
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri || (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
    if (process.env.EXPO_PUBLIC_API_URL) {
      apiUrl = process.env.EXPO_PUBLIC_API_URL;
    } else if (hostUri) {
      const ip = hostUri.split(':')[0];
      apiUrl = `http://${ip}:5001/api`;
    } else if (extraApiUrl) {
      apiUrl = extraApiUrl;
    } else {
      apiUrl = 'http://192.168.1.52:5001/api';
    }
  }
} else {
  // Production / Preview APK:
  if (process.env.EXPO_PUBLIC_API_URL) {
    apiUrl = process.env.EXPO_PUBLIC_API_URL;
  } else if (extraApiUrl && !extraApiUrl.includes('localhost') && !extraApiUrl.includes('127.0.0.1')) {
    apiUrl = extraApiUrl;
  }
}

console.log("🚀 [CONFIG] API_URL is set to:", apiUrl);

export const API_URL = apiUrl;

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  Constants.expoConfig?.extra?.googleWebClientId ||
  '';

export const STORAGE_KEYS = {
  TOKEN: "ems_auth_token",
  USER: "ems_user_data",
} as const;

export const APP_COLORS = {
  primary: "#D60000",
  primaryDark: "#B00000",
  primaryLight: "#FDECEC",
  secondary: "#111111",
  background: "#F7F7F7",
  card: "#FFFFFF",
  text: "#111111",
  textLight: "#666666",
  border: "#E5E5E5",
  success: "#10B981",
  danger: "#D60000",
  warning: "#F59E0B",
  placeholder: "#A3A3A3",
} as const;
