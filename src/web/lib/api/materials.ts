import apiClient from '../api-client';

export interface PrintingTechnology {
  id: string;
  name: string;
  description: string;
  type: string;
  maxDimensions: string;
  layerHeightRange: string;
  typicalSpeed: number;
}

export interface Material {
  id: string;
  name: string;
  brand: string | null;
  description: string;
  type: string;
  pricePerGram: number;
  availableColors: string[] | null;
  properties: string | null;
  isActive: boolean;
  technology: PrintingTechnology | null;
}

export interface CreateMaterialRequest {
  name: string;
  brand?: string;
  description: string;
  type: string;
  pricePerGram: number;
  availableColors?: string[];
  properties?: string;
  printingTechnologyId?: string;
}

export interface UpdateMaterialRequest {
  name?: string;
  brand?: string;
  description?: string;
  type?: string;
  pricePerGram?: number;
  availableColors?: string[];
  properties?: string;
  printingTechnologyId?: string;
  isActive?: boolean;
}

export const MATERIAL_TYPES = [
  'PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 
  'Resin', 'Metal', 'Ceramic', 'Wood', 'Carbon'
]

export const materialsApi = {
  getAll: () =>
    apiClient.get<Material[]>('/Materials'),

  getAllAdmin: () =>
    apiClient.get<Material[]>('/Materials/admin/all'),

  getById: (id: string) =>
    apiClient.get<Material>(`/Materials/${id}`),

  create: (data: CreateMaterialRequest) =>
    apiClient.post<Material>('/Materials', data),

  update: (id: string, data: UpdateMaterialRequest) =>
    apiClient.put<Material>(`/Materials/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/Materials/${id}`)
};