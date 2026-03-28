'use client';

import { display, mono } from '@/lib/fonts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesApi, QuoteAnalytics } from '@/lib/api/quotes';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ArrowLeft, TrendingUp, Clock, CheckCircle2, DollarSign } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Window = 30 | 90 | 365;

// ── Sub-components ────────────────────────────────────────────────────────────

function WindowToggle({
  value,
  onChange,
}: {
  value: Window;
  onChange: (w: Window) => void;
}) {
  const options: Window[] = [30, 90, 365];
  return (
    <div className="flex items-center border border-border">
      {options.map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className={`${mono.className} px-4 h-8 text-[9px] uppercase tracking-[0.15em] transition-colors border-r border-border last:border-r-0 ${
            value === w
              ? 'bg-amber-500/10 text-amber-700'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {w === 365 ? '1 yr' : `${w}d`}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-border bg-surface p-6">
      <div className="flex items-start justify-between mb-4">
        <Icon className={`h-3.5 w-3.5 ${highlight ? 'text-amber-600' : 'text-text-muted'}`} />
      </div>
      <div
        className={`font-black leading-none mb-2 ${highlight ? 'text-amber-700' : 'text-text-primary'}`}
        style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
      >
        {value}
      </div>
      <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-secondary mb-0.5`}>
        {label}
      </p>
      {sub && (
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.13em] text-text-muted`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-text-muted" />
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
        {title}
      </span>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-text-muted`}>
        {label}
      </span>
      <span className={`${mono.className} text-[11px] text-text-secondary`}>
        {value}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-border bg-surface p-6 space-y-3">
      <div className="h-3 w-3 bg-surface-alt animate-pulse rounded" />
      <div className="h-8 bg-surface-alt animate-pulse w-24" />
      <div className="h-2 bg-surface-alt animate-pulse w-32" />
    </div>
  );
}

function fmt(n: number | null, suffix = ''): string {
  if (n === null) return '—';
  return `${n}${suffix}`;
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuoteAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [window, setWindow] = useState<Window>(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'quotes', 'analytics', window],
    queryFn: () => quotesApi.getAnalytics(window),
  });

  const analytics: QuoteAnalytics | undefined = data?.data;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/quotes')}
            className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors mb-3`}
          >
            <ArrowLeft className="h-3 w-3" />
            All Quotes
          </button>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted mb-2`}>
            Analytics
          </p>
          <h1
            className="page-title"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Quote Conversion
          </h1>
        </div>
        <div className="pt-8">
          <WindowToggle value={window} onChange={setWindow} />
        </div>
      </div>

      {isError && (
        <div className={`${mono.className} px-4 py-3 border border-red-400/20 bg-red-400/[0.03] text-[10px] text-red-600`}>
          Failed to load analytics — please refresh.
        </div>
      )}

      {/* ── Conversion & Acceptance rates ── */}
      <div>
        <SectionHeader icon={TrendingUp} title="Funnel" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
          {isLoading ? (
            [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard
                icon={TrendingUp}
                label="Conversion Rate"
                value={fmt(analytics?.conversionRate ?? null, '%')}
                sub="Quotes → orders"
                highlight={
                    analytics?.conversionRate !== null &&
                    (analytics?.conversionRate ?? 0) >= 50
                }
              />
              <MetricCard
                icon={CheckCircle2}
                label="Acceptance Rate"
                value={fmt(analytics?.acceptanceRate ?? null, '%')}
                sub="Of terminal quotes"
              />
              <MetricCard
                icon={TrendingUp}
                label="Total Quotes"
                value={analytics?.totalQuotes ?? 0}
                sub={`Last ${window} days`}
              />
              <MetricCard
                icon={TrendingUp}
                label="Converted"
                value={analytics?.convertedQuotes ?? 0}
                sub="Became orders"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Volume breakdown + Time-to-conversion ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">

        {/* Volume breakdown */}
        <div className="bg-[var(--page-bg)] border border-border p-6">
          <SectionHeader icon={CheckCircle2} title="Quote Outcomes" />
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-surface-alt animate-pulse" />
              ))}
            </div>
          ) : (
            <div>
              <DataRow label="Accepted" value={analytics?.acceptedQuotes ?? 0} />
              <DataRow label="Converted to Order" value={analytics?.convertedQuotes ?? 0} />
              <DataRow label="Declined" value={analytics?.declinedQuotes ?? 0} />
              <DataRow label="Expired" value={analytics?.expiredQuotes ?? 0} />
              <DataRow
                label="Still Open"
                value={
                  (analytics?.totalQuotes ?? 0)
                  - (analytics?.acceptedQuotes ?? 0)
                  - (analytics?.declinedQuotes ?? 0)
                  - (analytics?.expiredQuotes ?? 0)
                }
              />
            </div>
          )}
        </div>

        {/* Time-to-conversion */}
        <div className="bg-[var(--page-bg)] border border-border p-6">
          <SectionHeader icon={Clock} title="Time to Conversion" />
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-surface-alt animate-pulse" />
              ))}
            </div>
          ) : analytics?.avgDaysToConversion === null ? (
            <p className={`${mono.className} text-[10px] text-text-muted pt-2`}>
              No conversions in this window yet.
            </p>
          ) : (
            <div>
              <DataRow
                label="Average"
                value={fmt(analytics?.avgDaysToConversion ?? null, ' days')}
              />
              <DataRow
                label="Fastest"
                value={fmt(analytics?.minDaysToConversion ?? null, ' days')}
              />
              <DataRow
                label="Slowest"
                value={fmt(analytics?.maxDaysToConversion ?? null, ' days')}
              />
            </div>
          )}
          <p className={`${mono.className} text-[8px] text-text-muted mt-4`}>
            Measured from quote accepted → order created
          </p>
        </div>
      </div>

      {/* ── Revenue split ── */}
      <div>
        <SectionHeader icon={DollarSign} title="Revenue Split" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {isLoading ? (
            [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard
                icon={DollarSign}
                label="Total Revenue"
                value={fmtCurrency(analytics?.totalRevenue ?? 0)}
                sub={`Last ${window} days, excl. cancelled`}
              />
              <MetricCard
                icon={DollarSign}
                label="Quote-Originated"
                value={fmtCurrency(analytics?.quoteOriginatedRevenue ?? 0)}
                sub={fmt(analytics?.quoteOriginatedRevenueShare ?? null, '% of total')}
                highlight={(analytics?.quoteOriginatedRevenue ?? 0) > 0}
              />
              <MetricCard
                icon={DollarSign}
                label="Direct Orders"
                value={fmtCurrency(analytics?.directRevenue ?? 0)}
                sub="No source quote"
              />
            </>
          )}
        </div>
      </div>

    </div>
  );
}