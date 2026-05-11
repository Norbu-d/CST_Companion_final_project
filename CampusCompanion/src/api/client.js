import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'http://10.177.154.11:3000';
// export const API_BASE = 'http://localhost:3000'; // iOS simulator

export const apiCall = async (path, options = {}) => {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
};

export const get   = (path)       => apiCall(path);
export const post  = (path, body) => apiCall(path, { method: 'POST',  body: JSON.stringify(body) });
export const patch = (path, body) => apiCall(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del   = (path)       => apiCall(path, { method: 'DELETE' });