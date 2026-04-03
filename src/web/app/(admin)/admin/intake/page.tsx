'use client';

import { mono } from '@/lib/fonts';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { intakeApi, type IntakeStatus, type MaterialIntakeResponse } from '@/lib/api/intake';
import { toProxiedUrl, formatStatus } from '@/lib/utils';
import {
  Search, Camera, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight,
  ClipboardCheck, RotateCcw,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: IntakeStatus | 'All'; label: string }[] = [
  { key: 'All',          label: 'All'          },
  { key: 'NeedsReview',  label: 'Needs Review' },
  { key: 'Uploaded',     label: 'Uploaded'     },
  { key: 'Extracting',   label: 'Extracting'   },
  { key: 'Approved',     label: 'Approved'     },
  { key: 'Rejected',     label: 'Rejected'     },
  { key: 'Failed',       label: 'Failed'       },
];

const STATUS_COLOUR: Record<IntakeStatus, string> = {
  Uploaded:     'badge-neutral',
  Extracting:   'badge-pending',
  NeedsReview:  'bg-amber-100 text-amber-800 border-amber-300',
  Approved:     'badge-success',
  Rejected:     'badge-danger',
  Failed:       'badge-danger',
};

const ACTION_STATUSES = new Set<IntakeStatus>(['NeedsReview', 'Failed']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function draftSummary(item: MaterialIntakeResponse): string {
  if (item.status === 'Uploaded') return 'Waiting for extraction…';
  if (item.status === 'Extracting') return 'Extracting…';
  const parts = [item.draftMaterialType, item.draftColor, item.draftBrand]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function StatusPill({ status }: { status: IntakeStatus }) {
  return (
    <span className={`${mono.className} inline-flex items-center border text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 ${STATUS_COLOUR[status]}`}>
      {status === 'NeedsReview' ? 'Needs Review' : formatStatus(status)}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminIntakePage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();

  const [activeStatus, setActiveStatus] = useState<IntakeStatus | 'All'>('NeedsReview');
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [retriggerIds, setRetriggerIds] = useState<Set<string>>(new Set());
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);

  const handleStatusChange = (s: IntakeStatus | 'All') => {
    setActiveStatus(s);
    setPage(1);
    setSearch('');
    setErrorMsg(null);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'intake', activeStatus, page, search],
    queryFn: () =>
      intakeApi.getQueue({
        status:     activeStatus === 'All' ? undefined : activeStatus,
        searchText: search.trim() || undefined,
        page,
        pageSize:   20,
      }).then(r => r.data),
  });

  const items      = data?.items      ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  async function handleRetrigger(id: string) {
    setRetriggerIds(prev => new Set(prev).add(id));
    setErrorMsg(null);
    try {
      await intakeApi.triggerExtraction(id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'intake'] });
    } catch {
      setErrorMsg('Failed to queue extraction. Please try again.');
    } finally {
      setRetriggerIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const needle = search.trim().toLowerCase();

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="page-title"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Material Intake
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted mt-1`}>
            {isLoading
              ? '—'
              : `${totalCount} intake${totalCount !== 1 ? 's' : ''}`}
            {activeStatus !== 'All' ? ` · ${activeStatus === 'NeedsReview' ? 'Needs Review' : formatStatus(activeStatus)}` : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Brand, type, color, notes…"
            className={`${mono.className} w-full h-8 bg-surface-alt border border-border pl-8 pr-3 text-[10px] uppercase tracking-[0.1em] text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`}
          />
        </div>
      </div>

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.12em]`}>{errorMsg}</p>
        </div>
      )}

      {/* ── Status tabs ── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map(({ key, label }) => {
          const active   = activeStatus === key;
          const isUrgent = key === 'NeedsReview' || key === 'Failed';
          return (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={`
                ${mono.className} inline-flex items-center text-[9px] uppercase tracking-[0.15em] px-3 h-7 border transition-colors
                ${active
                  ? isUrgent
                    ? 'bg-accent-light text-accent border-accent'
                    : 'bg-text-primary text-white border-text-primary'
                  : isUrgent
                    ? 'text-accent border-accent/30 bg-accent-light hover:border-accent'
                    : 'text-text-muted border-border hover:border-border-strong hover:text-text-secondary'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="border border-border">
        {/* Header row */}
        <div className={`${mono.className} grid grid-cols-[3rem_3fr_2fr_1.5fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-surface-alt text-[8px] uppercase tracking-[0.18em] text-text-muted`}>
          <span>Photo</span>
          <span>Draft Fields</span>
          <span>Source</span>
          <span>Uploaded</span>
          <span>Status</span>
          <span className="w-24" />
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 bg-surface-alt animate-pulse shrink-0" />
                <div className="h-3 bg-surface-alt animate-pulse flex-1 max-w-xs" />
                <div className="h-3 bg-surface-alt animate-pulse w-20" />
                <div className="h-3 bg-surface-alt animate-pulse w-24" />
                <div className="h-5 bg-surface-alt animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="py-16 text-center">
            <Camera className="h-6 w-6 text-text-muted mx-auto mb-3" />
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted`}>
              {needle
                ? `No intakes matching "${search}"`
                : `No ${activeStatus !== 'All' ? (activeStatus === 'NeedsReview' ? 'needs-review' : formatStatus(activeStatus).toLowerCase()) : ''} intakes`}
            </p>
          </div>
        ) : (
          /* Rows */
          <div>
            {items.map((item, i) => (
              <div
                key={item.id}
                className={`grid grid-cols-[3rem_3fr_2fr_1.5fr_1fr_auto] gap-4 items-center px-5 py-3 ${
                  i < items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="h-10 w-10 bg-surface-alt border border-border shrink-0 overflow-hidden">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toProxiedUrl(item.photoUrl)}
                      alt="Material photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Camera className="h-4 w-4 text-text-muted" />
                    </div>
                  )}
                </div>

                {/* Draft summary */}
                <div className="min-w-0">
                  <p className="text-text-primary text-sm truncate" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {draftSummary(item)}
                  </p>
                  {item.uploadNotes && (
                    <p className={`${mono.className} text-[9px] text-text-muted truncate mt-0.5`}>
                      {item.uploadNotes}
                    </p>
                  )}
                </div>

                {/* Source */}
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-text-secondary`}>
                  {item.sourceType === 'FileUpload' ? 'File Upload' : item.sourceType}
                </p>

                {/* Date */}
                <p className={`${mono.className} text-[9px] text-text-secondary`}>
                  {formatDate(item.createdAtUtc)}
                </p>

                {/* Status */}
                <StatusPill status={item.status} />

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end w-24">
                  {item.status === 'NeedsReview' && (
                    <button
                      onClick={() => router.push(`/admin/intake/${item.id}`)}
                      className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] px-3 h-7 border border-accent text-accent bg-accent-light hover:bg-accent hover:text-white transition-colors`}
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      Review
                    </button>
                  )}
                  {item.status === 'Failed' && (
                    <button
                      disabled={retriggerIds.has(item.id)}
                      onClick={() => handleRetrigger(item.id)}
                      className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] px-3 h-7 border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <RotateCcw className={`h-3 w-3 ${retriggerIds.has(item.id) ? 'animate-spin' : ''}`} />
                      Retry
                    </button>
                  )}
                  {!ACTION_STATUSES.has(item.status) && (
                    <button
                      onClick={() => router.push(`/admin/intake/${item.id}`)}
                      className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors`}
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
            Page {page} of {totalPages} · {totalCount} total
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 border border-border flex items-center justify-center text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 border border-border flex items-center justify-center text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
