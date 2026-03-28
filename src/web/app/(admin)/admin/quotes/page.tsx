'use client';

import { mono } from '@/lib/fonts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesApi, type QuoteRequest } from '@/lib/api/quotes';
import { ArrowRight, FileText, Search, AlertTriangle, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { formatStatus } from '@/lib/utils';


const STATUSES = [
  'All', 'Pending', 'InReview', 'QuoteProvided', 'Accepted', 'Declined', 'Expired', 'Cancelled',
];

const STATUS_COLOUR: Record<string, string> = {
  Pending:       'badge-pending',
  InReview:      'badge-pending',
  QuoteProvided: 'badge-info',
  Accepted:      'badge-success',
  Declined:      'badge-danger',
  Expired:       'badge-danger',
  Cancelled:     'badge-danger',
};

const URGENT_STATUSES = new Set(['Pending', 'InReview']);

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isDeadlineUrgent(quote: QuoteRequest): boolean {
  if (!quote.requiredByDate) return false;
  if (['Accepted', 'Declined', 'Cancelled', 'Expired'].includes(quote.status)) return false;
  const hoursLeft = (new Date(quote.requiredByDate).getTime() - Date.now()) / 36e5;
  return hoursLeft <= 48;
}

function StatusPill({ status }: { status: string }) {
  const colours = STATUS_COLOUR[status] ?? 'badge-neutral';
  return (
    <span className={`${mono.className} inline-flex items-center border text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 ${colours}`}>
      {formatStatus(status)}
    </span>
  );
}

export default function AdminQuotesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Pending');
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');

  const handleStatusChange = (s: string) => { setStatus(s); setPage(1); setSearch(''); };

  // Server-side filtered + paginated — all statuses including terminal ones
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quotes', status, page],
    queryFn: async () => {
      const r = await quotesApi.getAll({
        status: status === 'All' ? undefined : status,
        page,
        pageSize: 20,
      });
      return r.data;
    },
  });

  const { data: countsData } = useQuery({
    queryKey: ['admin', 'quotes', 'status-counts'],
    queryFn:  () => quotesApi.getStatusCounts(),
    staleTime: 30_000,
  });
  const counts = countsData?.data ?? {};

  const quotes     = data?.items     ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? quotes.filter(q =>
        q.requestNumber.toLowerCase().includes(needle) ||
        `${q.user?.firstName ?? ''} ${q.user?.lastName ?? ''}`.toLowerCase().includes(needle) ||
        (q.file?.originalFileName ?? '').toLowerCase().includes(needle)
      )
    : quotes;

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
            Quotes
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted mt-1`}>
            {isLoading
              ? '—'
              : needle
                ? `${filtered.length} matching "${search}"`
                : `${totalCount} quote${totalCount !== 1 ? 's' : ''}${status !== 'All' ? ` · ${formatStatus(status)}` : ''}`
            }
          </p>
          
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push('/admin/quotes/analytics')}
            className={`${mono.className} inline-flex items-center gap-2 border border-border 
                      text-text-secondary hover:text-text-primary hover:border-border-strong 
                      text-[9px] uppercase tracking-[0.18em] px-4 h-8 transition-colors`}
          >
            <BarChart2 className="h-3.5 w-3.5" /> Conversion Analytics
          </button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted pointer-events-none" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Request #, customer, or file..."
              className={`${mono.className} w-full h-8 bg-surface-alt border 
                        border-border pl-8 pr-3 text-[10px] uppercase tracking-[0.1em]
                        text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`}
            />
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = status === s;
          const urgent = URGENT_STATUSES.has(s);
          const count  = s === 'All'
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : counts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`
                ${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] px-3 h-7 border transition-colors
                ${active
                  ? urgent
                    ? 'bg-accent-light text-accent border-accent'
                    : 'bg-text-primary text-white border-text-primary'
                  : urgent
                    ? 'text-accent border-accent/30 bg-accent-light hover:border-accent'
                    : 'text-text-muted border-border hover:border-border-strong hover:text-text-secondary'
                }
              `}
            >
              {formatStatus(s)}
              {count > 0 && (
                <span className={`text-[8px] tabular-nums ${active ? 'opacity-70' : 'opacity-50'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-border">
        <div className={`${mono.className} grid grid-cols-[2fr_2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 px-6 py-3 border-b border-border bg-surface-alt text-[8px] uppercase tracking-[0.18em] text-text-muted`}>
          <span>Request</span><span>Customer</span><span>File</span><span>Qty</span>
          <span>Budget</span><span>Required By</span><span>Status</span>
          <span className="w-5" /><span className="w-6" />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3 bg-surface-alt animate-pulse w-28" />
                <div className="h-3 bg-surface-alt animate-pulse w-36" />
                <div className="h-3 bg-surface-alt animate-pulse w-40" />
                <div className="h-3 bg-surface-alt animate-pulse w-8" />
                <div className="h-3 bg-surface-alt animate-pulse w-16" />
                <div className="h-3 bg-surface-alt animate-pulse w-20" />
                <div className="h-5 bg-surface-alt animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-6 w-6 text-text-muted mx-auto mb-3" />
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted`}>
              {needle ? `No quotes matching "${search}"` : `No ${status !== 'All' ? formatStatus(status).toLowerCase() : ''} quotes`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((quote, i) => {
              const urgent = isDeadlineUrgent(quote);
              return (
                <div
                  key={quote.id}
                  onClick={() => router.push(`/admin/quotes/${quote.id}`)}
                  className={`grid grid-cols-[2fr_2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 items-center px-6 py-4 cursor-pointer hover:bg-surface-alt transition-colors group ${
                    i < filtered.length - 1 ? 'border-b border-border' : ''
                  } ${urgent ? 'bg-amber-50' : ''}`}
                >
                  <span className="text-text-primary text-sm font-medium truncate" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {quote.requestNumber}
                  </span>
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.12em] text-text-muted truncate`}>
                    {quote.user ? `${quote.user.firstName} ${quote.user.lastName}` : '—'}
                  </span>
                  <span className={`${mono.className} text-[10px] text-text-muted truncate`}>
                    {quote.file?.originalFileName ?? '—'}
                  </span>
                  <span className={`${mono.className} text-[10px] text-text-muted`}>{quote.quantity}</span>
                  <span className={`${mono.className} text-[10px] text-text-muted`}>{quote.budgetDisplay ?? '—'}</span>
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.1em] ${urgent ? 'text-accent' : 'text-text-muted'}`}>
                    {formatDate(quote.requiredByDate)}
                  </span>
                  <div><StatusPill status={quote.status} /></div>
                  <div className="w-5 flex items-center justify-center">
                    {urgent && (
                      <span title={`Required by ${formatDate(quote.requiredByDate)}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-text-secondary transition-colors" />
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-strong disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(n); return acc;
                }, [])
                .map((n, i) => n === 'ellipsis'
                  ? <span key={`e-${i}`} className={`${mono.className} w-7 h-7 flex items-center justify-center text-[9px] text-text-muted`}>···</span>
                  : <button key={n} onClick={() => setPage(n as number)}
                      className={`${mono.className} w-7 h-7 border text-[9px] transition-colors ${page === n ? 'bg-accent border-accent text-white font-semibold' : 'border-border text-text-muted hover:border-border-strong hover:text-text-secondary'}`}>
                      {n}
                    </button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-strong disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}