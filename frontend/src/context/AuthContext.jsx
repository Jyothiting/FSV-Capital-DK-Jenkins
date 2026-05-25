import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fsv_user')); }
    catch { return null; }
  });

  const login = useCallback(async (username, password) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    const { data } = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    localStorage.setItem('fsv_token', data.access_token);
    const me = await api.get('/auth/me');
    localStorage.setItem('fsv_user', JSON.stringify(me.data));
    setUser(me.data);
    return me.data;
  }, []);

  /** Register a new user. Returns the created UserResponse from the API. */
  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fsv_token');
    localStorage.removeItem('fsv_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
