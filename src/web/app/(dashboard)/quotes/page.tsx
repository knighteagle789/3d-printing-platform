'use client';

import { display, mono } from '@/lib/fonts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { quotesApi } from '@/lib/api/quotes';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { FileText } from 'lucide-react';
import { formatStatus } from '@/lib/utils';


// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Pending:       { dot: 'bg-border', text: 'text-text-muted'       },
  UnderReview:   { dot: 'bg-sky-400/60',     text: 'text-sky-400/70'     },
  QuoteProvided: { dot: 'bg-accent/60', text: 'text-accent/70'   },
  Accepted:      { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Expired:       { dot: 'bg-red-400/40',     text: 'text-red-400/50'     },
  Cancelled:     { dot: 'bg-red-400/40',     text: 'text-red-400/50'     },
};



function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { dot: 'bg-border', text: 'text-text-muted' };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.12em] ${s.text}`}>
        {formatStatus(status)}
      </span>
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuotesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const [flash] = useState<string | null>(
    searchParams.get('created') ? "Quote request submitted — we'll respond shortly." : null
  );
  if (searchParams.get('created') && typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/quotes');
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quotes'],
    queryFn:  () => quotesApi.getMine(),
    enabled:  isAuthenticated,
  });

  if (!isInitialized || !isAuthenticated) return null;

  const quotes = data?.data.items ?? [];

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8">
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-accent/70 mb-2`}>
          Quotes
        </p>
        <h1 className={`${display.className} text-4xl text-text-primary tracking-wide`}>
          My Quotes
        </h1>
        <p className={`${mono.className} text-[11px] text-text-muted mt-1`}>
          Request and track pricing for your projects
        </p>
      </div>

      {/* Flash */}
      {flash && (
        <div className={`${mono.className} mb-4 border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-2.5 text-[10px] text-emerald-400/80`}>
          {flash}
        </div>
      )}

      {/* Table */}
      <div className="border border-border">
        {/* Column headers */}
        <div
          className="grid px-4 py-2.5 border-b border-border"
          style={{ gridTemplateColumns: '1fr 1fr 2fr 4rem 8rem' }}
        >
          {['Request #', 'Date', 'File', 'Qty', 'Status'].map(h => (
            <span key={h} className={`${mono.className} text-[8px] uppercase tracking-[0.18em] text-text-muted`}>
              {h}
            </span>
          ))}
        </div>

        {isLoading && (
          <div className="px-4 py-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-5 bg-surface-alt animate-pulse rounded-sm" />
            ))}
          </div>
        )}

        {isError && (
          <p className={`${mono.className} text-[10px] text-red-400/70 px-4 py-6`}>
            Failed to load quotes — please refresh.
          </p>
        )}

        {!isLoading && !isError && quotes.length === 0 && (
          <div className="px-4 py-12 text-center">
            <FileText className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <p className={`${mono.className} text-[10px] text-text-muted`}>
              No quote requests yet — upload a model to get started.
            </p>
          </div>
        )}

        {quotes.map((quote, i) => (
          <div
            key={quote.id}
            onClick={() => router.push(`/quotes/${quote.id}`)}
            className={`grid items-center px-4 py-3 cursor-pointer hover:bg-surface-alt transition-colors group ${i < quotes.length - 1 ? 'border-b border-border' : ''}`}
            style={{ gridTemplateColumns: '1fr 1fr 2fr 4rem 8rem' }}
          >
            <span className={`${mono.className} text-[11px] text-text-primary group-hover:text-accent transition-colors`}>
              {quote.requestNumber}
            </span>
            <span className={`${mono.className} text-[10px] text-text-muted`}>
              {new Date(quote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className={`${mono.className} text-[10px] text-text-muted truncate pr-4`}>
              {quote.file?.originalFileName ?? '—'}
            </span>
            <span className={`${mono.className} text-[10px] text-text-muted`}>
              {quote.quantity}
            </span>
            <StatusPill status={quote.status} />
          </div>
        ))}
      </div>
    </div>
  );
}