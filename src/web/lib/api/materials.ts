import apiClient from '../api-client';
import type { PrintingTechnology } from './technologies';


// Public-facing material (customer view)
export interface Material {
  id: string;
  type: string;
  color: string;
  finish: MaterialFinish | null;
  grade: MaterialGrade | null;
  description: string | null;
  pricePerGram: number;
  isActive: boolean;
  technology: PrintingTechnology | null;
}

// Admin material (includes stock, internal fields)
export interface AdminMaterial extends Material {
  brand: string | null;
  stockGrams: number;
  lowStockThresholdGrams: number | null;
  isLowStock: boolean;
  notes: string | null;
  printSettings: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMaterialRequest {
  type: string;
  color: string;
  finish?: MaterialFinish;
  grade?: MaterialGrade;
  description?: string;
  brand?: string;
  pricePerGram: number;
  stockGrams: number;
  lowStockThresholdGrams?: number;
  notes?: string;
  printSettings?: string;
  printingTechnologyId?: string;
}

export interface UpdateMaterialRequest {
  type?: string;
  color?: string;
  finish?: MaterialFinish;
  grade?: MaterialGrade;
  description?: string;
  brand?: string;
  pricePerGram?: number;
  stockGrams?: number;
  lowStockThresholdGrams?: number;
  notes?: string;
  printSettings?: string;
  printingTechnologyId?: string;
  isActive?: boolean;
}

export type MaterialFinish = 'Standard' | 'Matte' | 'Silk' | 'Glossy';
export type MaterialGrade = 'Economy' | 'Standard' | 'Premium';

export const MATERIAL_TYPES = [
  'PLA', 'ABS', 'PETG', 'TPU', 'Nylon',
  'Resin', 'ASA', 'PolyCarbonate', 'Metal', 'Carbon', 'Wood', 'Ceramic', 'Other'
];

export const MATERIAL_FINISHES: MaterialFinish[] = ['Standard', 'Matte', 'Silk', 'Glossy'];
export const MATERIAL_GRADES: MaterialGrade[] = ['Economy', 'Standard', 'Premium'];

export const materialsApi = {
  getAll: () =>
    apiClient.get<Material[]>('/Materials'),

  getAllAdmin: () =>
    apiClient.get<AdminMaterial[]>('/Materials/admin/all'),

  getById: (id: string) =>
    apiClient.get<Material>(`/Materials/${id}`),

  getByIdAdmin: (id: string) =>
    apiClient.get<AdminMaterial>(`/Materials/admin/${id}`),

  create: (data: CreateMaterialRequest) =>
    apiClient.post<AdminMaterial>('/Materials', data),

  update: (id: string, data: UpdateMaterialRequest) =>
    apiClient.put<AdminMaterial>(`/Materials/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/Materials/${id}`),
};