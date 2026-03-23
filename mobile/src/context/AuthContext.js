import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch, login as apiLogin, logout as apiLogout } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      if (token) {
        const userData = await apiFetch('/api/me');
        setUser(userData);
      }
    } catch {
      await SecureStore.deleteItemAsync('jwt_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const userData = await apiLogin(username, password);
    setUser(userData);
    return userData;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
