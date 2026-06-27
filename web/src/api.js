// web/src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('anomia_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ➕ LOGGING UNTUK DEBUG
  if (import.meta.env.DEV) {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // ➕ LOGGING UNTUK DEBUG
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    return response;
  },
  (error) => {
    // ➕ LOGGING ERROR YANG LEBIH DETAIL
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Data:`, error.response?.data);
    }

    // Handle 401
    if (error.response?.status === 401) {
      localStorage.removeItem('anomia_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?error=session_expired';
      }
    }

    // Handle 403
    if (error.response?.status === 403) {
      const errorMessage = error.response.data?.error || '';
      if (errorMessage.includes('ditangguhkan') || errorMessage.includes('suspended')) {
        localStorage.removeItem('anomia_token');
        window.location.href = `/login?error=${encodeURIComponent(errorMessage)}`;
      }
    }

    // Handle 404 - Tampilkan pesan yang lebih jelas
    if (error.response?.status === 404) {
      console.warn(`⚠️  Endpoint not found: ${error.config?.url}`);
      console.warn(`   Ini berarti backend belum mengimplementasikan endpoint ini.`);
    }

    return Promise.reject(error);
  }
);

export default api;