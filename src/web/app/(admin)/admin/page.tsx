'use client';

import { useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { quotesApi } from '@/lib/api/quotes';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Package, FileText, Clock, AlertCircle, ArrowRight,
  Layers, RefreshCw, Plus, TrendingUp,
} from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Status colours ────────────────────────────────────────────────────────────

const ORDER_STATUS_COLOUR: Record<string, string> = {
  Draft:         'text-white/30 bg-white/[0.04] border-white/8',
  Submitted:     'text-amber-400 bg-amber-400/8 border-amber-400/20',
  InReview:      'text-amber-400 bg-amber-400/8 border-amber-400/20',
  Approved:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  InProduction:  'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Printing:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  PostProcessing:'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  QualityCheck:  'text-blue-400 bg-blue-400/8 border-blue-400/20',
  Packaging:     'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Shipped:       'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Delivered:     'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Completed:     'text-white/40 bg-white/[0.04] border-white/8',
  Cancelled:     'text-red-400 bg-red-400/8 border-red-400/20',
  OnHold:        'text-amber-400 bg-amber-400/8 border-amber-400/20',
};

const QUOTE_STATUS_COLOUR: Record<string, string> = {
  Pending:       'text-amber-400 bg-amber-400/8 border-amber-400/20',
  UnderReview:   'text-amber-400 bg-amber-400/8 border-amber-400/20',
  QuoteProvided: 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Accepted:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Expired:       'text-red-400 bg-red-400/8 border-red-400/20',
  Cancelled:     'text-red-400 bg-red-400/8 border-red-400/20',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function StatusPill({ status, colourMap }: { status: string; colourMap: Record<string, string> }) {
  const colours = colourMap[status] ?? 'text-white/30 bg-white/[0.04] border-white/8';
  return (
    <span className={`${mono.className} inline-flex items-center border text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 ${colours}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { user }    = useAuthStore();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Greeting based on time of day
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'orders', 'recent'],
    queryFn:  () => ordersApi.getRecent(10),
  });

  const { data: pendingQuotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ['admin', 'quotes', 'pending'],
    queryFn:  () => quotesApi.getPending(1, 50),
  });

  const recentOrders  = recentOrdersData?.data ?? [];
  const pendingQuotes = pendingQuotesData?.data.items ?? [];

  const orderCounts = recentOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const needsAttention = (orderCounts['Submitted'] ?? 0)
    + (orderCounts['InReview'] ?? 0)
    + (orderCounts['QualityCheck'] ?? 0);

  const inProgress = (orderCounts['InProduction'] ?? 0)
    + (orderCounts['Printing'] ?? 0)
    + (orderCounts['PostProcessing'] ?? 0)
    + (orderCounts['Packaging'] ?? 0);

  // Today's activity
  const today = new Date().toDateString();
  const ordersToday = recentOrders.filter(
    o => new Date(o.createdAt).toDateString() === today
  ).length;
  const quotesToday = pendingQuotes.filter(
    q => new Date(q.createdAt).toDateString() === today
  ).length;

  // Empty state — no orders and no quotes at all
  const isEmpty = !ordersLoading && !quotesLoading
    && recentOrders.length === 0 && pendingQuotes.length === 0;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/25 mb-2`}>
            {greeting}{user?.firstName ? `, ${user.firstName}` : ''}
          </p>
          <h1
            className="font-black tracking-tight leading-[1.1] text-white"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Dashboard
          </h1>
        </div>

        {/* Refresh */}
        <div className="flex items-center gap-3 pt-1 shrink-0">
          <p className={`${mono.className} text-[8px] uppercase tracking-[0.18em] text-white/18 hidden sm:block`}>
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'New Material',   icon: Plus,    href: '/admin/materials/new' },
          { label: 'All Orders',     icon: Package, href: '/admin/orders'        },
          { label: 'All Quotes',     icon: FileText,href: '/admin/quotes'        },
          { label: 'Materials',      icon: Layers,  href: '/admin/materials'     },
        ].map(({ label, icon: Icon, href }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`${mono.className} inline-flex items-center gap-2 border border-white/10 text-white/40 hover:text-white hover:border-white/25 text-[9px] uppercase tracking-[0.18em] px-4 h-8 transition-colors`}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      {/* ── Today's activity ── */}
      {!ordersLoading && !quotesLoading && (
        <div className={`${mono.className} flex items-center gap-6 px-5 py-3.5 border border-white/8 bg-white/[0.02]`}>
          <TrendingUp className="h-3.5 w-3.5 text-white/20 shrink-0" />
          <div className="flex items-center gap-6 text-[9px] uppercase tracking-[0.18em]">
            <span>
              <span className={ordersToday > 0 ? 'text-amber-400' : 'text-white/25'}>
                {ordersToday}
              </span>
              <span className="text-white/20 ml-1.5">order{ordersToday !== 1 ? 's' : ''} today</span>
            </span>
            <span className="text-white/10">·</span>
            <span>
              <span className={quotesToday > 0 ? 'text-amber-400' : 'text-white/25'}>
                {quotesToday}
              </span>
              <span className="text-white/20 ml-1.5">quote{quotesToday !== 1 ? 's' : ''} today</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Empty / first-run state ── */}
      {isEmpty ? (
        <div className="border border-white/8 p-12 text-center space-y-4">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-white/20`}>
            No activity yet
          </p>
          <p className="text-white/35 text-sm leading-relaxed max-w-sm mx-auto">
            Your dashboard will populate once orders and quotes start coming in.
            Share your pricing page to get started.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => router.push('/pricing')}
              className={`${mono.className} inline-flex items-center gap-2 bg-amber-400 text-black text-[10px] uppercase tracking-[0.18em] font-semibold px-5 h-9 hover:bg-amber-300 transition-colors`}
            >
              View Pricing Page <ArrowRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => router.push('/admin/materials/new')}
              className={`${mono.className} inline-flex items-center gap-2 border border-white/12 text-white/40 text-[10px] uppercase tracking-[0.18em] px-5 h-9 hover:text-white hover:border-white/25 transition-colors`}
            >
              <Plus className="h-3 w-3" /> Add Material
            </button>
          </div>
        </div>
      ) : (
        <>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/8">
        <StatCard
          icon={AlertCircle}
          label="Needs Attention"
          sub="Submitted · In Review · QC"
          value={ordersLoading ? null : needsAttention}
          urgent={needsAttention > 0}
          onClick={() => router.push('/admin/orders')}
          monoClass={mono.className}
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          sub="Production · Printing · Packaging"
          value={ordersLoading ? null : inProgress}
          onClick={() => router.push('/admin/orders')}
          monoClass={mono.className}
        />
        <StatCard
          icon={FileText}
          label="Pending Quotes"
          sub="Awaiting response"
          value={quotesLoading ? null : pendingQuotes.length}
          urgent={pendingQuotes.length > 0}
          onClick={() => router.push('/admin/quotes')}
          monoClass={mono.className}
        />
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/8">

        {/* Recent Orders */}
        <div className="bg-[#0d0a06]">
          <PanelHeader
            icon={Package}
            label="Recent Orders"
            onViewAll={() => router.push('/admin/orders')}
            monoClass={mono.className}
          />
          {ordersLoading ? (
            <LoadingRows />
          ) : recentOrders.length === 0 ? (
            <EmptyRow label="No recent orders" monoClass={mono.className} />
          ) : (
            <div>
              {recentOrders.map((order, i) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className={`flex items-center justify-between px-6 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                    i < recentOrders.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div>
                    <p className="text-white/80 text-sm font-medium" style={{ fontFamily: 'var(--font-epilogue)' }}>
                      {order.orderNumber}
                    </p>
                    <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-white/25 mt-0.5`}>
                      {order.user?.firstName} {order.user?.lastName} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 text-sm font-medium" style={{ fontFamily: 'var(--font-epilogue)' }}>
                      ${order.totalPrice.toFixed(2)}
                    </span>
                    <StatusPill status={order.status} colourMap={ORDER_STATUS_COLOUR} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Quotes */}
        <div className="bg-[#0d0a06]">
          <PanelHeader
            icon={FileText}
            label="Pending Quotes"
            onViewAll={() => router.push('/admin/quotes')}
            monoClass={mono.className}
          />
          {quotesLoading ? (
            <LoadingRows />
          ) : pendingQuotes.length === 0 ? (
            <EmptyRow label="No pending quotes" monoClass={mono.className} />
          ) : (
            <div>
              {pendingQuotes.slice(0, 8).map((quote, i) => (
                <div
                  key={quote.id}
                  onClick={() => router.push(`/admin/quotes/${quote.id}`)}
                  className={`flex items-center justify-between px-6 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                    i < Math.min(pendingQuotes.length, 8) - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div>
                    <p className="text-white/80 text-sm font-medium" style={{ fontFamily: 'var(--font-epilogue)' }}>
                      {quote.requestNumber}
                    </p>
                    <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-white/25 mt-0.5`}>
                      {quote.file?.originalFileName ?? 'No file'} · {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={quote.status} colourMap={QUOTE_STATUS_COLOUR} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, sub, value, urgent, onClick, monoClass,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  value: number | null;
  urgent?: boolean;
  onClick: () => void;
  monoClass: string;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-[#0d0a06] p-7 cursor-pointer hover:bg-white/[0.025] transition-colors group"
    >
      <div className="flex items-start justify-between mb-5">
        <Icon className={`h-4 w-4 ${urgent ? 'text-amber-400' : 'text-white/25'}`} />
        <ArrowRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
      </div>
      <div
        className={`font-black leading-none mb-3 ${urgent ? 'text-amber-400' : 'text-white'}`}
        style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2rem, 4vw, 3rem)' }}
      >
        {value === null ? (
          <span className="inline-block w-10 h-8 bg-white/[0.06] animate-pulse" />
        ) : value}
      </div>
      <p className={`${monoClass} text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1`}>
        {label}
      </p>
      <p className={`${monoClass} text-[8px] uppercase tracking-[0.15em] text-white/22`}>
        {sub}
      </p>
    </div>
  );
}

function PanelHeader({
  icon: Icon, label, onViewAll, monoClass,
}: {
  icon: React.ElementType;
  label: string;
  onViewAll: () => void;
  monoClass: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
      <div className="flex items-center gap-2.5">
        <Icon className="h-3.5 w-3.5 text-white/30" />
        <span className={`${monoClass} text-[10px] uppercase tracking-[0.2em] text-white/50`}>
          {label}
        </span>
      </div>
      <button
        onClick={onViewAll}
        className={`${monoClass} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/25 hover:text-amber-400 transition-colors`}
      >
        View all <ArrowRight className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="p-6 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3 bg-white/[0.05] animate-pulse w-28" />
            <div className="h-2 bg-white/[0.03] animate-pulse w-40" />
          </div>
          <div className="h-5 bg-white/[0.05] animate-pulse w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ label, monoClass }: { label: string; monoClass: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className={`${monoClass} text-[9px] uppercase tracking-[0.22em] text-white/20`}>
        {label}
      </p>
    </div>
  );
}