import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, token, role, loading, userLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);