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
    apiClient.get<AuthResponse['user']>('/Auth/me'),
};