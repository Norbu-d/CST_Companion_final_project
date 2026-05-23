import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Resolve API URL for Expo Go / emulator / manual override.
 * Expo Go: uses the same LAN IP as Metro (shown when you run `npx expo start`).
 */
function resolveApiBase() {
  // Manual override — set to your PC's Wi-Fi IPv4 from `ipconfig` if auto-detect fails
  const MANUAL_API_BASE = null; // e.g. 'http://192.168.0.111:3000'
  if (MANUAL_API_BASE) return MANUAL_API_BASE;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  // Android emulator → host machine
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:3000';
  }

  // Last resort (update if your home Wi-Fi IP changes)
  return 'http://192.168.0.111:3000';
}

export const API_BASE = resolveApiBase();

export const apiCall = async (path, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: `Invalid server response (${res.status})` };
    }

    if (!res.ok && data?.success !== false) {
      return { success: false, message: data?.message || `Server error (${res.status})` };
    }

    return data;
  } catch (err) {
    console.warn('[API]', path, err?.message, '→', API_BASE);
    return {
      success: false,
      message: `Cannot reach server at ${API_BASE}. Same Wi-Fi as PC? Backend running?`,
    };
  }
};

export const get   = (path)       => apiCall(path);
export const post  = (path, body) => apiCall(path, { method: 'POST',  body: JSON.stringify(body) });
export const patch = (path, body) => apiCall(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del   = (path)       => apiCall(path, { method: 'DELETE' });
