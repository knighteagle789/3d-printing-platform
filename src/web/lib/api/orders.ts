import apiClient from '../api-client';

export interface FileSummary {
  id: string;
  originalFileName: string;
  fileSizeBytes: number;
  isAnalyzed: boolean;
  storageUrl: string | null;
}

export interface MaterialSummary {
  id: string;
  type: string;
  color: string;
  finish?: string;
  grade?: string;
  pricePerGram: number;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  color: string | null;
  specialInstructions: string | null;
  estimatedWeight: number | null;
  estimatedPrintTime: number | null;
  quality: string;
  infill: number | null;
  supportStructures: boolean;
  material: MaterialSummary | null;
  file: FileSummary | null;
}

export interface OrderStatusHistory {
  id: string;
  status: string;
  notes: string | null;
  changedAt: string;
  changedBy: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalPrice: number;
  shippingCost: number | null;
  tax: number | null;
  notes: string | null;
  shippingAddress: string | null;
  requiredByDate: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: OrderItem[];
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ordersApi = {
  // GET /Orders?userId=&page=&pageSize= — StaffOrAdmin only (GH #10 resolved)
  getAll: (params?: { userId?: string; page?: number; pageSize?: number }) =>
    apiClient.get<PagedResponse<Order>>('/Orders', { params }),

  getMine: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResponse<Order>>('/Orders/my', {
      params: { page, pageSize },
    }),

  getById: (id: string) =>
    apiClient.get<Order>(`/Orders/${id}`),

  getByStatus: (status: string, page = 1, pageSize = 50) =>
    apiClient.get<PagedResponse<Order>>(`/Orders/status/${status}`, {
      params: { status, page, pageSize },
    }),

  getRecent: (count = 10) =>
    apiClient.get<Order[]>(`/Orders/recent?count=${count}`),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch<Order>(`/Orders/${id}/status`, { status, notes }),

  getHistory: (id: string) =>
    apiClient.get<OrderStatusHistory[]>(`/Orders/${id}/history`),

  create: (data: {
    notes?: string;
    shippingAddress?: string;
    requiredByDate?: string;
    items: {
      fileId: string;
      materialId: string;
      quantity: number;
      color?: string;
      specialInstructions?: string;
      quality: string;
      infill?: number;
      supportStructures: boolean;
    }[];
  }) => apiClient.post<Order>('/Orders', data),

  createPaymentSession: (orderId: string) =>
    apiClient.post<{ url: string }>(`/Payments/create-session/${orderId}`),
};