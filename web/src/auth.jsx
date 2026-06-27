// web/src/auth.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fungsi terpusat untuk handle session expired
  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('anomia_token');
    setUser(null);
    setUnreadCount(0);
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?error=session_expired';
    }
  }, []);

  // Fetch unread count dengan polling (setiap 30 detik)
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) {
        if (err.response?.status === 401) {
          handleSessionExpired();
        }
        console.error('Failed to fetch unread count:', err);
      }
    };

    // Fetch langsung saat user login
    fetchUnreadCount();

    // Polling setiap 30 detik
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user, handleSessionExpired]);

  // Load user data saat app pertama kali dibuka
  useEffect(() => {
    const token = localStorage.getItem('anomia_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch((err) => {
        if (err.response?.status === 401) {
          handleSessionExpired();
        } else {
          localStorage.removeItem('anomia_token');
        }
      })
      .finally(() => setLoading(false));
  }, [handleSessionExpired]);

  // Login function
  const login = useCallback(async (username, password) => {
    try {
      const r = await api.post('/auth/login', { username, password });
      localStorage.setItem('anomia_token', r.data.token);
      setUser(r.data.user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login gagal';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Register function
  const register = useCallback(async (username, password, displayName, turnstileToken) => {
    try {
      const r = await api.post('/auth/register', {
        username,
        password,
        displayName,
        turnstileToken
      });
      localStorage.setItem('anomia_token', r.data.token);
      setUser(r.data.user);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Registrasi gagal';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('anomia_token');
    setUser(null);
    setUnreadCount(0);
  }, []);

  // Update user data (untuk edit profil)
  const updateUser = useCallback((newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: updateUser,
        login,
        register,
        logout,
        loading,
        unreadCount,
        setUnreadCount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};