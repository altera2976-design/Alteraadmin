import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * API Configuration & Security Policy
 */
const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;

let apiUrl = 'https://alterabackend.onrender.com/api';

if (__DEV__) {
  if (process.env.EXPO_PUBLIC_API_URL) {
    apiUrl = process.env.EXPO_PUBLIC_API_URL;
  } else if (extraApiUrl && !extraApiUrl.includes("alterabackend.onrender.com")) {
    apiUrl = extraApiUrl;
  } else if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
    apiUrl = `https://alterabackend.onrender.com/api`;
  } else {
    // Determine local network IP from Expo debugger host if running via Expo Go / Metro when env/config is missing
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri || (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      apiUrl = `https://alterabackend.onrender.com/api`;
    } else {
      apiUrl = 'https://alterabackend.onrender.com/api';
    }
  }
} else {
  // Production / Preview APK: Trust environment variable if provided
  if (process.env.EXPO_PUBLIC_API_URL) {
    apiUrl = process.env.EXPO_PUBLIC_API_URL;
  } else if (extraApiUrl) {
    apiUrl = extraApiUrl;
  } else {
    apiUrl = 'https://alterabackend.onrender.com/api';
  }

  // Force HTTPS in production if unencrypted HTTP was configured,
  // EXCEPT for local network development (localhost or 192.168.*)
  if (
    apiUrl.startsWith('http://') &&
    !apiUrl.includes('localhost') &&
    !apiUrl.includes('127.0.0.1') &&
    !apiUrl.includes('192.168.')
  ) {
    apiUrl = apiUrl.replace('http://', 'https://');
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
  primaryLight: "rgba(214, 0, 0, 0.1)",
  secondary: "#475569",
  background: "#F4F6F9",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textLight: "#94A3B8",
  placeholder: "#9CA3AF",
  border: "#E0E0E0",
  success: "#7A131A",
  danger: "#EF4444",
  warning: "#D97706",
};
