'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesApi, type QuoteRequest } from '@/lib/api/quotes';
import { JetBrains_Mono } from 'next/font/google';
import { ArrowRight, FileText, Search, AlertTriangle } from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  'All', 'Pending', 'UnderReview', 'QuoteProvided', 'Accepted', 'Expired', 'Cancelled',
];

const STATUS_COLOUR: Record<string, string> = {
  Pending:       'text-amber-400 bg-amber-400/8 border-amber-400/20',
  UnderReview:   'text-amber-400 bg-amber-400/8 border-amber-400/20',
  QuoteProvided: 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Accepted:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Expired:       'text-red-400 bg-red-400/8 border-red-400/20',
  Cancelled:     'text-red-400 bg-red-400/8 border-red-400/20',
};

const URGENT_STATUSES = new Set(['Pending', 'UnderReview']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isDeadlineUrgent(quote: QuoteRequest): boolean {
  if (!quote.requiredByDate) return false;
  if (quote.status === 'Accepted' || quote.status === 'Cancelled' || quote.status === 'Expired') return false;
  const hoursLeft = (new Date(quote.requiredByDate).getTime() - Date.now()) / 36e5;
  return hoursLeft <= 48;
}

function StatusPill({ status }: { status: string }) {
  const colours = STATUS_COLOUR[status] ?? 'text-white/30 bg-white/[0.04] border-white/8';
  return (
    <span className={`${mono.className} inline-flex items-center border text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 ${colours}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminQuotesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Pending');
  const [search, setSearch] = useState('');

  const handleStatusChange = (s: string) => {
    setStatus(s);
    setSearch('');
  };

  // Fetch all quotes (pending endpoint returns all non-terminal statuses);
  // for Accepted/Expired/Cancelled we'd need a separate endpoint — tracked as a
  // future backend enhancement (similar to GH #10 for orders).
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quotes', 'all'],
    queryFn: async () => {
      const r = await quotesApi.getPending(1, 200);
      return r.data;
    },
  });

  const allQuotes = data?.items ?? [];

  // Filter by status tab
  const statusFiltered = status === 'All'
    ? allQuotes
    : allQuotes.filter(q => q.status === status);

  // Filter by search
  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? statusFiltered.filter(q =>
        q.requestNumber.toLowerCase().includes(needle) ||
        `${q.user?.firstName ?? ''} ${q.user?.lastName ?? ''}`.toLowerCase().includes(needle) ||
        (q.file?.originalFileName ?? '').toLowerCase().includes(needle)
      )
    : statusFiltered;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black tracking-tight leading-[1.1] text-white"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Quotes
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/25 mt-1`}>
            {isLoading
              ? '—'
              : needle
                ? `${filtered.length} matching "${search}"`
                : `${statusFiltered.length} quote${statusFiltered.length !== 1 ? 's' : ''}${status !== 'All' ? ` · ${status}` : ''}`
            }
          </p>
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Request #, customer, or file..."
            className={`${mono.className} w-full h-8 bg-white/[0.03] border border-white/10 pl-8 pr-3 text-[10px] uppercase tracking-[0.1em] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors`}
          />
        </div>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = status === s;
          const urgent = URGENT_STATUSES.has(s);
          const count  = s === 'All' ? allQuotes.length : allQuotes.filter(q => q.status === s).length;
          return (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`
                ${mono.className} text-[9px] uppercase tracking-[0.15em] px-3 h-7 border transition-colors
                ${active
                  ? urgent
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-white text-black border-white'
                  : urgent
                    ? 'text-amber-400/60 border-amber-400/20 hover:border-amber-400/40 hover:text-amber-400'
                    : 'text-white/30 border-white/10 hover:border-white/25 hover:text-white/60'
                }
              `}
            >
              {s}
              {count > 0 && (
                <span className={`ml-1.5 ${active ? 'opacity-60' : 'opacity-40'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="border border-white/8">

        {/* Header row */}
        <div className={`${mono.className} grid grid-cols-[2fr_2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 px-6 py-3 border-b border-white/8 bg-white/[0.02] text-[8px] uppercase tracking-[0.18em] text-white/25`}>
          <span>Request</span>
          <span>Customer</span>
          <span>File</span>
          <span>Qty</span>
          <span>Budget</span>
          <span>Required By</span>
          <span>Status</span>
          <span className="w-5" />
          <span className="w-6" />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3 bg-white/[0.05] animate-pulse w-28" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-36" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-40" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-8" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-16" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-20" />
                <div className="h-5 bg-white/[0.05] animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-6 w-6 text-white/10 mx-auto mb-3" />
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/20`}>
              {needle
                ? `No quotes matching "${search}"`
                : `No ${status !== 'All' ? status.toLowerCase() : ''} quotes`}
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
                  className={`grid grid-cols-[2fr_2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 items-center px-6 py-4 cursor-pointer hover:bg-white/[0.025] transition-colors group ${
                    i < filtered.length - 1 ? 'border-b border-white/5' : ''
                  } ${urgent ? 'bg-amber-400/[0.03]' : ''}`}
                >
                  {/* Request number */}
                  <span
                    className="text-white/80 text-sm font-medium truncate"
                    style={{ fontFamily: 'var(--font-epilogue)' }}
                  >
                    {quote.requestNumber}
                  </span>

                  {/* Customer */}
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.12em] text-white/35 truncate`}>
                    {quote.user
                      ? `${quote.user.firstName} ${quote.user.lastName}`
                      : '—'}
                  </span>

                  {/* File */}
                  <span className={`${mono.className} text-[10px] text-white/30 truncate`}>
                    {quote.file?.originalFileName ?? '—'}
                  </span>

                  {/* Quantity */}
                  <span className={`${mono.className} text-[10px] text-white/35`}>
                    {quote.quantity}
                  </span>

                  {/* Budget */}
                  <span className={`${mono.className} text-[10px] text-white/30`}>
                    {quote.budgetDisplay ?? '—'}
                  </span>

                  {/* Required by */}
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.1em] ${
                    urgent ? 'text-amber-400' : 'text-white/30'
                  }`}>
                    {formatDate(quote.requiredByDate)}
                  </span>

                  {/* Status */}
                  <div>
                    <StatusPill status={quote.status} />
                  </div>

                  {/* Urgency flag */}
                  <div className="w-5 flex items-center justify-center">
                    {urgent && (
                      <span title={`Required by ${formatDate(quote.requiredByDate)}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/40 transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}