'use client';

import { mono } from '@/lib/fonts';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  intakeApi,
  type MaterialIntakeResponse,
  type IntakeApprovalOutcome,
  type ConfidenceEntry,
} from '@/lib/api/intake';
import { toProxiedUrl, formatStatus } from '@/lib/utils';
import { ArrowLeft, Camera, AlertTriangle, RotateCcw, Check, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConfidenceMap = Record<string, ConfidenceEntry>;

type ViewMode = 'idle' | 'approving' | 'rejecting';

// ── Helpers ───────────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, string> = {
  Brand: 'brand',
  MaterialType: 'type',
  Color: 'color',
  SpoolWeightGrams: 'spoolWeight',
  PrintSettingsHints: 'printSettings',
  BatchOrLot: 'batchOrLot',
};

function parseConfidenceMap(raw: string | null): ConfidenceMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, { score?: number; Score?: number; sourceText?: string; SourceText?: string } | null>;
    const result: ConfidenceMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v) continue;
      const key = KEY_MAP[k] ?? k;
      result[key] = {
        score: v.score ?? v.Score ?? 0,
        sourceText: v.sourceText ?? v.SourceText ?? undefined,
      };
    }
    return result;
  } catch { return {}; }
}

function confidenceColour(score: number): string {
  if (score >= 0.85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score >= 0.60) return 'text-amber-600  bg-amber-50  border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function pct(score: number) { return `${Math.round(score * 100)}%`; }

const STATUS_COLOUR: Record<string, string> = {
  Uploaded:    'badge-neutral',
  Extracting:  'badge-pending',
  NeedsReview: 'bg-amber-100 text-amber-800 border-amber-300',
  Approved:    'badge-success',
  Rejected:    'badge-danger',
  Failed:      'badge-danger',
};

const OUTCOME_LABEL: Record<IntakeApprovalOutcome, string> = {
  Created:          'New material created',
  Updated:          'Existing material updated',
  NeedsMergeReview: 'Possible duplicate — merge review needed',
};

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  confidence,
  edited,
}: {
  label: string;
  value: string | number | null | undefined;
  confidence?: ConfidenceEntry;
  edited?: boolean;
}) {
  const display = value != null && value !== '' ? String(value) : '—';
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted shrink-0 w-36`}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className="text-text-primary text-sm block truncate"
          style={{ fontFamily: 'var(--font-epilogue)' }}
        >
          {display}
          {edited && (
            <span className={`${mono.className} ml-2 text-[8px] uppercase tracking-[0.15em] text-blue-600`}>
              corrected
            </span>
          )}
        </span>
        {confidence?.sourceText && (
          <span className={`${mono.className} text-[8px] text-text-muted mt-0.5 block truncate italic`}>
            &ldquo;{confidence.sourceText}&rdquo;
          </span>
        )}
      </div>
      {confidence && (
        <span className={`${mono.className} inline-flex items-center border text-[8px] px-1.5 py-0.5 shrink-0 ${confidenceColour(confidence.score)}`}>
          {pct(confidence.score)}
        </span>
      )}
    </div>
  );
}

// ── Approve form ──────────────────────────────────────────────────────────────

function ApproveForm({
  intake,
  confidenceMap,
  onSuccess,
  onCancel,
}: {
  intake: MaterialIntakeResponse;
  confidenceMap: ConfidenceMap;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [brand,       setBrand]       = useState(intake.draftBrand       ?? '');
  const [type,        setType]        = useState(intake.draftMaterialType ?? '');
  const [color,       setColor]       = useState(intake.draftColor        ?? '');
  const [weight,      setWeight]      = useState(intake.draftSpoolWeightGrams?.toString() ?? '');
  const [batchOrLot,  setBatchOrLot]  = useState(intake.draftBatchOrLot  ?? '');
  const [price,       setPrice]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Confidence gate ──────────────────────────────────────────────────────
  const gatedFields = [
    { confKey: 'brand', label: 'Brand',         current: brand, original: intake.draftBrand       ?? '' },
    { confKey: 'type',  label: 'Material Type', current: type,  original: intake.draftMaterialType ?? '' },
    { confKey: 'color', label: 'Color',         current: color, original: intake.draftColor        ?? '' },
  ];
  const lowConfUncorrected = gatedFields.filter(({ confKey, current, original }) => {
    const entry = confidenceMap[confKey];
    return entry !== undefined && entry.score < 0.60 && current.trim() === original.trim();
  });
  const canSubmit = lowConfUncorrected.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal < 0) {
      setError('Price per gram must be a non-negative number.');
      return;
    }
    setSubmitting(true);
    try {
      await intakeApi.approve(intake.id, {
        correctedBrand:           brand !== (intake.draftBrand       ?? '') ? brand || null : null,
        correctedMaterialType:    type  !== (intake.draftMaterialType ?? '') ? type  || null : null,
        correctedColor:           color !== (intake.draftColor        ?? '') ? color || null : null,
        correctedSpoolWeightGrams: weight !== (intake.draftSpoolWeightGrams?.toString() ?? '') ? parseFloat(weight) || null : null,
        correctedBatchOrLot:      batchOrLot !== (intake.draftBatchOrLot ?? '') ? batchOrLot || null : null,
        pricePerGram: priceVal,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Approval failed. Please check the fields and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
        Review and correct extracted fields, then set price to approve.
      </p>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.12em]`}>{error}</p>
        </div>
      )}

      {lowConfUncorrected.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 border border-amber-200 bg-amber-50 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.12em] font-semibold`}>
              Correction required before approving
            </p>
            <p className={`${mono.className} text-[9px] mt-0.5`}>
              Low-confidence field{lowConfUncorrected.length > 1 ? 's' : ''} must be corrected:{' '}
              {lowConfUncorrected.map(f => f.label).join(', ')}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'brand', label: 'Brand',         value: brand,  setter: setBrand, original: intake.draftBrand       ?? '' },
          { id: 'type',  label: 'Material Type',  value: type,   setter: setType,  original: intake.draftMaterialType ?? '' },
          { id: 'color', label: 'Color',          value: color,  setter: setColor, original: intake.draftColor        ?? '' },
        ].map(({ id, label, value, setter, original }) => {
          const entry = confidenceMap[id];
          const needsCorrection = entry !== undefined && entry.score < 0.60 && value.trim() === original.trim();
          return (
            <div key={id}>
              <label className={`${mono.className} block text-[8px] uppercase tracking-[0.2em] ${needsCorrection ? 'text-amber-600' : 'text-text-muted'} mb-1`}>
                {label}
              </label>
              <input
                type="text"
                value={value}
                onChange={e => setter(e.target.value)}
                className={`${mono.className} w-full h-8 bg-surface-alt border ${needsCorrection ? 'border-amber-300' : 'border-border'} px-3 text-[10px] text-text-secondary focus:outline-none focus:border-accent transition-colors`}
              />
            </div>
          );
        })}

        <div>
          <label className={`${mono.className} block text-[8px] uppercase tracking-[0.2em] text-text-muted mb-1`}>
            Spool Weight (g)
          </label>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className={`${mono.className} w-full h-8 bg-surface-alt border border-border px-3 text-[10px] text-text-secondary focus:outline-none focus:border-accent transition-colors`}
          />
        </div>

        <div>
          <label className={`${mono.className} block text-[8px] uppercase tracking-[0.2em] text-text-muted mb-1`}>
            Batch / Lot
          </label>
          <input
            type="text"
            value={batchOrLot}
            onChange={e => setBatchOrLot(e.target.value)}
            className={`${mono.className} w-full h-8 bg-surface-alt border border-border px-3 text-[10px] text-text-secondary focus:outline-none focus:border-accent transition-colors`}
          />
        </div>

        <div>
          <label className={`${mono.className} block text-[8px] uppercase tracking-[0.2em] text-red-600 mb-1`}>
            Price per Gram ($) *
          </label>
          <input
            required
            type="number"
            step="0.0001"
            min="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 0.0250"
            className={`${mono.className} w-full h-8 bg-surface-alt border border-red-200 px-3 text-[10px] text-text-secondary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] px-4 h-8 bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Check className="h-3 w-3" />
          {submitting ? 'Approving…' : 'Approve + Create Material'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-4 h-8 border border-border text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Reject form ───────────────────────────────────────────────────────────────

function RejectForm({
  intake,
  onSuccess,
  onCancel,
}: {
  intake: MaterialIntakeResponse;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [reason,     setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError('A rejection reason is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await intakeApi.reject(intake.id, { reason: reason.trim() });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Rejection failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.12em]`}>{error}</p>
        </div>
      )}
      <div>
        <label className={`${mono.className} block text-[8px] uppercase tracking-[0.2em] text-text-muted mb-1`}>
          Rejection Reason *
        </label>
        <textarea
          required
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe why this intake is being rejected…"
          className={`${mono.className} w-full bg-surface-alt border border-border px-3 py-2 text-[10px] text-text-secondary focus:outline-none focus:border-accent transition-colors resize-none placeholder:text-text-muted`}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] px-4 h-8 bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <X className="h-3 w-3" />
          {submitting ? 'Rejecting…' : 'Confirm Reject'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-4 h-8 border border-border text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntakeDetailPage() {
  const params       = useParams();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const id           = params.id as string;

  const [viewMode,    setViewMode]    = useState<ViewMode>('idle');
  const [retriggering, setRetriggering] = useState(false);
  const [retriggerErr, setRetriggerErr] = useState<string | null>(null);

  const { data: intake, isLoading, error } = useQuery<MaterialIntakeResponse>({
    queryKey: ['admin', 'intake', id],
    queryFn: () => intakeApi.getById(id).then(r => r.data),
    enabled: !!id,
  });

  async function handleRetrigger() {
    setRetriggering(true);
    setRetriggerErr(null);
    try {
      await intakeApi.triggerExtraction(id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'intake', id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'intake'] });
    } catch {
      setRetriggerErr('Failed to queue extraction. Please try again.');
    } finally {
      setRetriggering(false);
    }
  }

  async function handleActionSuccess() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'intake'] });
    router.push('/admin/intake');
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <div className="h-4 w-32 bg-surface-alt animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="aspect-square bg-surface-alt animate-pulse" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-surface-alt animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !intake) {
    return (
      <div className="max-w-5xl">
        <button onClick={() => router.back()} className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-text-secondary mb-6`}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-3 p-6 border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.12em]`}>
            Intake record not found or could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const confidence = parseConfidenceMap(intake.confidenceMap);
  const isTerminal = intake.status === 'Approved' || intake.status === 'Rejected';
  const canReview  = intake.status === 'NeedsReview';
  const canRetry   = intake.status === 'Failed';

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Back + header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/intake')}
            className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-text-secondary mb-2 transition-colors`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Intake Queue
          </button>
          <h1
            className="page-title"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)' }}
          >
            Intake Review
          </h1>
          <p className={`${mono.className} text-[9px] text-text-muted mt-1`}>
            {intake.id}
          </p>
        </div>
        <span className={`${mono.className} inline-flex items-center border text-[9px] uppercase tracking-[0.15em] px-3 py-1 ${STATUS_COLOUR[intake.status] ?? 'badge-neutral'}`}>
          {intake.status === 'NeedsReview' ? 'Needs Review' : formatStatus(intake.status)}
        </span>
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Photo ── */}
        <div className="border border-border bg-surface-alt flex items-center justify-center aspect-square">
          {intake.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={toProxiedUrl(intake.photoUrl)}
              alt="Material photo"
              className="w-full h-full object-contain"
            />
          ) : (
            <Camera className="h-10 w-10 text-text-muted" />
          )}
        </div>

        {/* ── Details panel ── */}
        <div className="space-y-5">

          {/* Extracted fields */}
          <div>
            <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted mb-3`}>
              Extracted Fields
              {intake.extractedAtUtc && (
                <span className="ml-2 normal-case">· {formatDate(intake.extractedAtUtc)}</span>
              )}
            </p>
            <div className="border border-border">
              <FieldRow label="Brand"        value={intake.draftBrand}             confidence={confidence['brand']}    />
              <FieldRow label="Material Type" value={intake.draftMaterialType}      confidence={confidence['type']}     />
              <FieldRow label="Color"         value={intake.draftColor}             confidence={confidence['color']}    />
              <FieldRow label="Spool Weight"  value={intake.draftSpoolWeightGrams != null ? `${intake.draftSpoolWeightGrams} g` : null} confidence={confidence['spoolWeight']} />
              <FieldRow label="Print Settings" value={intake.draftPrintSettingsHints} confidence={confidence['printSettings']} />
              <FieldRow label="Batch / Lot"   value={intake.draftBatchOrLot}        confidence={confidence['batchOrLot']} />
            </div>
          </div>

          {/* Metadata */}
          <div>
            <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted mb-3`}>Metadata</p>
            <div className="border border-border">
              <FieldRow label="Source"       value={intake.sourceType === 'FileUpload' ? 'File Upload' : intake.sourceType} />
              <FieldRow label="Upload Notes" value={intake.uploadNotes} />
              <FieldRow label="Attempts"     value={intake.extractionAttemptCount} />
              <FieldRow label="Submitted"    value={formatDate(intake.createdAtUtc)} />
              {intake.actionedAtUtc && (
                <FieldRow label="Actioned" value={formatDate(intake.actionedAtUtc)} />
              )}
            </div>
          </div>

          {/* Outcome (terminal states) */}
          {isTerminal && (
            <div className={`px-4 py-3 border ${intake.status === 'Approved' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] ${intake.status === 'Approved' ? 'text-emerald-700' : 'text-red-700'} font-semibold`}>
                {intake.status === 'Approved' ? 'Approved' : 'Rejected'}
              </p>
              {intake.approvalOutcome && (
                <p className={`${mono.className} text-[9px] text-emerald-600 mt-1`}>
                  {OUTCOME_LABEL[intake.approvalOutcome]}
                </p>
              )}
              {intake.rejectionReason && (
                <p className={`${mono.className} text-[9px] text-red-600 mt-1`}>{intake.rejectionReason}</p>
              )}
            </div>
          )}

          {/* Extraction error */}
          {intake.lastExtractionError && intake.status === 'Failed' && (
            <div className="px-4 py-3 border border-red-200 bg-red-50">
              <p className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-red-700 font-semibold mb-1`}>
                Last Extraction Error
              </p>
              <p className={`${mono.className} text-[9px] text-red-600`}>{intake.lastExtractionError}</p>
            </div>
          )}

          {/* Retrigger action */}
          {canRetry && (
            <div className="space-y-2">
              {retriggerErr && (
                <div className="flex items-center gap-2 px-3 py-2 border border-red-200 bg-red-50">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <p className={`${mono.className} text-[9px] text-red-600`}>{retriggerErr}</p>
                </div>
              )}
              <button
                disabled={retriggering}
                onClick={handleRetrigger}
                className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] px-4 h-8 border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <RotateCcw className={`h-3 w-3 ${retriggering ? 'animate-spin' : ''}`} />
                {retriggering ? 'Queuing Extraction…' : 'Retry Extraction'}
              </button>
            </div>
          )}

          {/* Review actions */}
          {canReview && viewMode === 'idle' && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setViewMode('approving')}
                className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] px-4 h-8 bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors`}
              >
                <Check className="h-3 w-3" />
                Approve
              </button>
              <button
                onClick={() => setViewMode('rejecting')}
                className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] px-4 h-8 border border-red-300 text-red-600 hover:bg-red-50 transition-colors`}
              >
                <X className="h-3 w-3" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Approve / Reject form (below grid) ── */}
      {canReview && viewMode !== 'idle' && (
        <div className="border border-border p-5">
          <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted mb-4`}>
            {viewMode === 'approving' ? 'Approve Intake' : 'Reject Intake'}
          </p>
          {viewMode === 'approving' ? (
            <ApproveForm
              intake={intake}
              confidenceMap={confidence}
              onSuccess={handleActionSuccess}
              onCancel={() => setViewMode('idle')}
            />
          ) : (
            <RejectForm
              intake={intake}
              onSuccess={handleActionSuccess}
              onCancel={() => setViewMode('idle')}
            />
          )}
        </div>
      )}
    </div>
  );
}
