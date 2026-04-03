import apiClient from '../api-client';

// ── Enums ────────────────────────────────────────────────────────────────────

export type IntakeStatus =
  | 'Uploaded'
  | 'Extracting'
  | 'NeedsReview'
  | 'Approved'
  | 'Rejected'
  | 'Failed';

export type IntakeSourceType = 'Mobile' | 'Webcam' | 'FileUpload';

export type IntakeApprovalOutcome = 'Created' | 'Updated' | 'NeedsMergeReview';

// Numeric → string maps covering both possible API serialization modes
// (JsonStringEnumConverter not yet active → numbers; active → strings pass through)
const INTAKE_STATUS_MAP: Record<number, IntakeStatus> = {
  0: 'Uploaded',
  1: 'Extracting',
  2: 'NeedsReview',
  3: 'Approved',
  4: 'Rejected',
  5: 'Failed',
};

const INTAKE_SOURCE_MAP: Record<number, IntakeSourceType> = {
  0: 'Mobile',
  1: 'Webcam',
  2: 'FileUpload',
};

const INTAKE_OUTCOME_MAP: Record<number, IntakeApprovalOutcome> = {
  0: 'Created',
  1: 'Updated',
  2: 'NeedsMergeReview',
};

function normalizeIntake(raw: MaterialIntakeResponse): MaterialIntakeResponse {
  return {
    ...raw,
    status: (typeof raw.status === 'number'
      ? INTAKE_STATUS_MAP[raw.status as unknown as number]
      : raw.status) ?? raw.status,
    sourceType: (typeof raw.sourceType === 'number'
      ? INTAKE_SOURCE_MAP[raw.sourceType as unknown as number]
      : raw.sourceType) ?? raw.sourceType,
    approvalOutcome: raw.approvalOutcome != null && typeof raw.approvalOutcome === 'number'
      ? INTAKE_OUTCOME_MAP[raw.approvalOutcome as unknown as number] ?? raw.approvalOutcome
      : raw.approvalOutcome,
  };
}

// ── Response types ────────────────────────────────────────────────────────────

export interface MaterialIntakeResponse {
  id: string;
  status: IntakeStatus;
  sourceType: IntakeSourceType;
  photoUrl: string;
  uploadNotes: string | null;
  extractionAttemptCount: number;
  lastExtractionError: string | null;
  extractedAtUtc: string | null;
  draftBrand: string | null;
  draftMaterialType: string | null;
  draftColor: string | null;
  draftSpoolWeightGrams: number | null;
  draftPrintSettingsHints: string | null;
  draftBatchOrLot: string | null;
  /** JSON string: Record<fieldName, { score: number; sourceText?: string }> */
  confidenceMap: string | null;
  approvedMaterialId: string | null;
  approvalOutcome: IntakeApprovalOutcome | null;
  rejectionReason: string | null;
  uploadedByUserId: string;
  actionedByUserId: string | null;
  createdAtUtc: string;
  actionedAtUtc: string | null;
}

export interface IntakePagedResponse {
  items: MaterialIntakeResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UploadIntakeRequest {
  file: File;
  sourceType?: IntakeSourceType;
  uploadNotes?: string;
}

export interface ApproveIntakeRequest {
  correctedBrand?: string | null;
  correctedMaterialType?: string | null;
  correctedColor?: string | null;
  correctedSpoolWeightGrams?: number | null;
  correctedPrintSettingsHints?: string | null;
  correctedBatchOrLot?: string | null;
  pricePerSpool: number;
}

export interface ApproveIntakeResponse {
  id: string;
  materialId: string;
  outcome: IntakeApprovalOutcome;
  actionedByUserId: string;
  actionedAtUtc: string;
}

export interface RejectIntakeRequest {
  reason: string;
}

export interface IntakeQueueParams {
  status?: IntakeStatus;
  searchText?: string;
  page?: number;
  pageSize?: number;
  createdAfterUtc?: string;
  createdBeforeUtc?: string;
}

export interface ConfidenceEntry {
  score: number;
  sourceText?: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const intakeApi = {
  upload: ({ file, sourceType, uploadNotes }: UploadIntakeRequest) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sourceType)   formData.append('sourceType',   sourceType);
    if (uploadNotes)  formData.append('uploadNotes',  uploadNotes);
    return apiClient.post<MaterialIntakeResponse>('/material-intake', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getQueue: async (params?: IntakeQueueParams) => {
    const r = await apiClient.get<IntakePagedResponse>('/material-intake', { params });
    r.data.items = r.data.items.map(normalizeIntake);
    return r;
  },

  getById: async (id: string) => {
    const r = await apiClient.get<MaterialIntakeResponse>(`/material-intake/${id}`);
    r.data = normalizeIntake(r.data);
    return r;
  },

  triggerExtraction: (id: string) =>
    apiClient.post(`/material-intake/${id}/extract`),

  approve: (id: string, request: ApproveIntakeRequest) =>
    apiClient.post<ApproveIntakeResponse>(`/material-intake/${id}/approve`, request),

  reject: (id: string, request: RejectIntakeRequest) =>
    apiClient.post(`/material-intake/${id}/reject`, request),
};