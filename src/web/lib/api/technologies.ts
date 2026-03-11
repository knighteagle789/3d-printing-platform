import apiClient from '../api-client';

export interface PrintingTechnology {
  id: string;
  name: string;
  description: string;
  type: string;
  maxDimensions: string;
  layerHeightRange: string;
  typicalSpeed: number;
  isActive: boolean;
}

export const technologiesApi = {
  getAll: () =>
    apiClient.get<PrintingTechnology[]>('/PrintingTechnologies'),

  getById: (id: string) =>
    apiClient.get<PrintingTechnology>(`/PrintingTechnologies/${id}`),
};