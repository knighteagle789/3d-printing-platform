import apiClient from '../api-client';

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  companyName: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/Auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/Auth/register', data),

  me: () =>
    apiClient.get<UserProfile>('/Auth/me'),

  updateProfile: (data: { firstName?: string; lastName?: string; phoneNumber?: string; companyName?: string }) =>
    apiClient.put<UserProfile>('/Auth/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/Auth/change-password', data),

  forgotPassword: (email: string) =>
    apiClient.post('/Auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/Auth/reset-password', { token, newPassword }),
};