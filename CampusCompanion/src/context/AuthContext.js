import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from '../api/client';
import { registerPushTokenWithBackend } from '../utils/registerPushToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [[, t], [, u]] = await AsyncStorage.multiGet(['token', 'user']);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch (_) {}
      setLoading(false);
      setUserLoaded(true);
    })();
  }, []);

  // Refresh profile from API so id/department are always present (fixes leave fetch)
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await get('/users/me');
        if (res?.success && res.data) {
          await AsyncStorage.setItem('user', JSON.stringify(res.data));
          setUser(res.data);
        }
      } catch (_) {}
    })();
  }, [token]);

  // Register push token whenever user is logged in (login + app reopen)
  useEffect(() => {
    if (!token) return;
    registerPushTokenWithBackend().catch((err) => {
      console.warn('Push token registration:', err?.message || err);
    });
  }, [token]);

  const login = async (tokenVal, userVal) => {
    await AsyncStorage.multiSet([
      ['token', tokenVal],
      ['user', JSON.stringify(userVal)],
    ]);
    setToken(tokenVal);
    setUser(userVal);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (userVal) => {
    await AsyncStorage.setItem('user', JSON.stringify(userVal));
    setUser(userVal);
  };

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, token, role, loading, userLoaded, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);