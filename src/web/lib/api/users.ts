import apiClient from '../api-client';

export interface UserSummary {
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

export interface PagedUsersResponse {
  items: UserSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const usersApi = {
  getAll: (page = 1, pageSize = 20) =>
    apiClient.get<PagedUsersResponse>('/Users', { params: { page, pageSize } }),

  getById: (id: string) =>
    apiClient.get<UserSummary>(`/Users/${id}`),

  updateRoles: (id: string, roles: string[]) =>
    apiClient.put<UserSummary>(`/Users/${id}/roles`, { roles }),

  setActive: (id: string, isActive: boolean) =>
    apiClient.patch<UserSummary>(`/Users/${id}/active`, { isActive }),
};