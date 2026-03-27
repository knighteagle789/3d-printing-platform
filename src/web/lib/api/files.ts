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

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

/** Encode a block index as a base64 block ID (Azure requirement: all IDs same length). */
function blockId(index: number): string {
  return btoa(String(index).padStart(8, '0'));
}

export const filesApi = {
  /** Legacy single-request upload — kept for small files and internal use. */
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<UploadedFile>('/Files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Chunked upload — splits the file into 4MB blocks, uploads each block,
   * then commits. Calls onProgress(0–100) as blocks are uploaded.
   */
  uploadChunked: async (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<UploadedFile> => {
    // 1. Initiate — get a blobName
    const { data: { blobName } } = await apiClient.post<{ blobName: string }>(
      '/Files/upload/initiate',
      { fileName: file.name },
    );

    // 2. Upload blocks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const blockIds: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start  = i * CHUNK_SIZE;
      const end    = Math.min(start + CHUNK_SIZE, file.size);
      const chunk  = file.slice(start, end);
      const id     = blockId(i);

      const formData = new FormData();
      formData.append('block', chunk, file.name);

      await apiClient.put('/Files/upload/block', formData, {
        params:  { blobName, blockId: id },
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      blockIds.push(id);
      onProgress?.(Math.round(((i + 1) / totalChunks) * 90)); // 0–90% during upload
    }

    // 3. Commit
    const { data } = await apiClient.post<UploadedFile>('/Files/upload/complete', {
      blobName,
      fileName:     file.name,
      contentType:  file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
      blockIds,
    });

    onProgress?.(100);
    return data;
  },

  getMine: (page = 1, pageSize = 20) =>
    apiClient.get<{ items: UploadedFile[]; totalCount: number }>(
      '/Files/my', { params: { page, pageSize } }
    ),

  getById: (id: string) =>
    apiClient.get<UploadedFile>(`/Files/${id}`),

  clonePortfolioFile: (portfolioItemId: string) =>
    apiClient.post<UploadedFile>(`/Files/clone-portfolio/${portfolioItemId}`),

  delete: (id: string) =>
    apiClient.delete(`/Files/${id}`),
};