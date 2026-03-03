import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  initializeFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    if (token && userJson) {
      // We have a token - mark as authenticated so protected pages don't redirect
      // The actual user data will be fetched by the dashboard layout
      try {
        const user = JSON.parse(userJson);
        set({ user, token, isAuthenticated: true, isInitialized: true });
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
        set({ isInitialized: true });
      }
      
    } else {
        set({ isInitialized: true });
    }
  },
}));