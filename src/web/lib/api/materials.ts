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
  description: string;
  type: string;
  pricePerGram: number;
  availableColors: string[] | null;
  properties: string | null;
  isActive: boolean;
  technology: PrintingTechnology | null;
}

export const materialsApi = {
  getAll: () =>
    apiClient.get<Material[]>('/Materials'),

  getById: (id: string) =>
    apiClient.get<Material>(`/Materials/${id}`),
};