import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5267/api/v1';

// ─── Authenticated client ──────────────────────────────────────────────────
// Used for all protected endpoints (orders, quotes, admin, etc.)
// Attaches JWT token and redirects to /login on 401.
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Public client ────────────────────────────────────────────────────────
// Used for public endpoints (materials list, portfolio, etc.)
// No auth token, no redirect — safe to use on unauthenticated pages.
export const publicApiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default apiClient;