import apiClient from '../api-client';

export interface FileSummary {
  id: string;
  originalFileName: string;
  fileSizeBytes: number;
  isAnalyzed: boolean;
}

export interface MaterialSummary {
  id: string;
  name: string;
  type: string;
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
  getMine: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResponse<Order>>('/Orders/my', {
      params: { page, pageSize },
    }),

  getById: (id: string) =>
    apiClient.get<Order>(`/Orders/${id}`),

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
};