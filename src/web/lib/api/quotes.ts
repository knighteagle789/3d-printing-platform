import apiClient from '../api-client';
import { PagedResponse } from './orders';

export interface QuoteResponseDto {
  id: string;
  price: number;
  shippingCost: number | null;
  estimatedDays: number;
  recommendedColor: string | null;
  technicalNotes: string | null;
  alternativeOptions: string | null;
  expiresAt: string;
  isAccepted: boolean;
  acceptedAt: string | null;
  createdAt: string;
  recommendedMaterial: { id: string; name: string; } | null;
  createdBy: { id: string; firstName: string; lastName: string; } | null;
}

export interface QuoteRequest {
  id: string;
  requestNumber: string;
  status: string;
  quantity: number;
  preferredColor: string | null;
  requiredByDate: string | null;
  specialRequirements: string | null;
  notes: string | null;
  budgetDisplay: string | null;
  createdAt: string;
  file: { id: string; originalFileName: string; } | null;
  preferredMaterial: { id: string; name: string; } | null;
  responses: QuoteResponseDto[];
}

export interface CreateQuoteRequest {
  fileId?: string;
  quantity: number;
  preferredMaterialId?: string;
  preferredColor?: string;
  requiredByDate?: string;
  specialRequirements?: string;
  notes?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export const quotesApi = {
  getMine: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResponse<QuoteRequest>>('/Quotes/my', {
      params: { page, pageSize },
    }),

  getById: (id: string) =>
    apiClient.get<QuoteRequest>(`/Quotes/${id}`),

  create: (data: CreateQuoteRequest) =>
    apiClient.post<QuoteRequest>('/Quotes', data),

  acceptResponse: (quoteId: string, responseId: string) =>
    apiClient.post<QuoteRequest>(
      `/Quotes/${quoteId}/responses/${responseId}/accept`
    ),
};