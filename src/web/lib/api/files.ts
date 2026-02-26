import apiClient from '../api-client';

export interface FileAnalysis {
  volumeInCubicMm: number | null;
  dimensionX: number | null;
  dimensionY: number | null;
  dimensionZ: number | null;
  triangleCount: number | null;
  estimatedPrintTimeHours: number | null;
  estimatedWeightGrams: number | null;
  complexityScore: number | null;
  requiresSupport: boolean | null;
  isManifold: boolean | null;
  warnings: string | null;
  analyzedAt: string;
}

export interface UploadedFile {
  id: string;
  originalFileName: string;
  storageUrl: string;
  fileType: string;
  fileSizeBytes: number;
  isAnalyzed: boolean;
  uploadedAt: string;
  analysis: FileAnalysis | null;
}

export const filesApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<UploadedFile>('/Files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getMine: (page = 1, pageSize = 20) =>
    apiClient.get<{ items: UploadedFile[]; totalCount: number }>(
      '/Files/my', { params: { page, pageSize } }
    ),

  getById: (id: string) =>
    apiClient.get<UploadedFile>(`/Files/${id}`),

  delete: (id: string) =>
    apiClient.delete(`/Files/${id}`),
};