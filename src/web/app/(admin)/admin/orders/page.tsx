'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi, type Order, type PagedResponse } from '@/lib/api/orders';
import { JetBrains_Mono } from 'next/font/google';
import { ArrowRight, Package, ChevronLeft, ChevronRight, Search, AlertTriangle } from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  'All',
  'Draft', 'Submitted', 'InReview', 'QuoteProvided', 'Approved',
  'InProduction', 'Printing', 'PostProcessing', 'QualityCheck',
  'Packaging', 'Shipped', 'Delivered', 'Completed',
  'OnHold', 'Cancelled',
];

const STATUS_COLOUR: Record<string, string> = {
  Draft:          'text-white/30 bg-white/[0.04] border-white/8',
  Submitted:      'text-amber-400 bg-amber-400/8 border-amber-400/20',
  InReview:       'text-amber-400 bg-amber-400/8 border-amber-400/20',
  QuoteProvided:  'text-amber-400 bg-amber-400/8 border-amber-400/20',
  Approved:       'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  InProduction:   'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Printing:       'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  PostProcessing: 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  QualityCheck:   'text-blue-400 bg-blue-400/8 border-blue-400/20',
  Packaging:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Shipped:        'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Delivered:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Completed:      'text-white/40 bg-white/[0.04] border-white/8',
  Cancelled:      'text-red-400 bg-red-400/8 border-red-400/20',
  OnHold:         'text-amber-400 bg-amber-400/8 border-amber-400/20',
};

// Statuses that signal action needed — used to style the filter tab
const URGENT_STATUSES = new Set(['Submitted', 'InReview', 'QualityCheck', 'OnHold']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// Returns true if requiredByDate is within 48 hours and order isn't done
const DONE_STATUSES = new Set(['Shipped', 'Delivered', 'Completed', 'Cancelled']);

function isDeadlineUrgent(order: Order): boolean {
  if (!order.requiredByDate) return false;
  if (DONE_STATUSES.has(order.status)) return false;
  const hoursLeft = (new Date(order.requiredByDate).getTime() - Date.now()) / 36e5;
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

export default function AdminOrdersPage() {
  const router  = useRouter();
  const [status, setStatus] = useState<string>('Submitted');
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');

  // Reset to page 1 when filter or search changes
  const handleStatusChange = (s: string) => {
    setStatus(s);
    setPage(1);
    setSearch('');
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: async (): Promise<PagedResponse<Order>> => {
      if (status === 'All') {
        const r = await ordersApi.getRecent(50);
        return { items: r.data, totalCount: r.data.length, page: 1, pageSize: 50, totalPages: 1 };
      }
      const r = await ordersApi.getByStatus(status, page, 20);
      return r.data;
    },
  });

  const orders     = data?.items     ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  // Client-side search filter (order number or customer name)
  const needle = search.trim().toLowerCase();
  const filteredOrders = needle
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(needle) ||
        `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''}`.toLowerCase().includes(needle)
      )
    : orders;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black tracking-tight leading-[1.1] text-white"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Orders
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/25 mt-1`}>
            {isLoading ? '—' : `${needle ? filteredOrders.length : totalCount} order${totalCount !== 1 ? 's' : ''}`}
            {status !== 'All' && !needle ? ` · ${status}` : ''}
            {needle ? ` matching "${search}"` : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Order # or customer..."
            className={`${mono.className} w-full h-8 bg-white/[0.03] border border-white/10 pl-8 pr-3 text-[10px] uppercase tracking-[0.1em] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors`}
          />
        </div>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active  = status === s;
          const urgent  = URGENT_STATUSES.has(s);
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
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="border border-white/8">

        {/* Table header */}
        <div className={`${mono.className} grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 px-6 py-3 border-b border-white/8 bg-white/[0.02] text-[8px] uppercase tracking-[0.18em] text-white/25`}>
          <span>Order</span>
          <span>Customer</span>
          <span>Items</span>
          <span>Total</span>
          <span>Date</span>
          <span>Status</span>
          <span className="w-5" />
          <span className="w-6" />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3 bg-white/[0.05] animate-pulse w-32" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-40" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-8" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-16" />
                <div className="h-3 bg-white/[0.04] animate-pulse w-24" />
                <div className="h-5 bg-white/[0.05] animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-6 w-6 text-white/10 mx-auto mb-3" />
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/20`}>
              {needle ? `No orders matching "${search}"` : `No ${status !== 'All' ? status.toLowerCase() : ''} orders`}
            </p>
          </div>
        ) : (
          <div>
            {filteredOrders.map((order: Order, i: number) => {
              const urgent = isDeadlineUrgent(order);
              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className={`grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 items-center px-6 py-4 cursor-pointer hover:bg-white/[0.025] transition-colors group ${
                    i < filteredOrders.length - 1 ? 'border-b border-white/5' : ''
                  } ${urgent ? 'bg-amber-400/[0.03]' : ''}`}
                >
                  {/* Order number */}
                  <span
                    className="text-white/80 text-sm font-medium truncate"
                    style={{ fontFamily: 'var(--font-epilogue)' }}
                  >
                    {order.orderNumber}
                  </span>

                  {/* Customer */}
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.12em] text-white/35 truncate`}>
                    {order.user
                      ? `${order.user.firstName} ${order.user.lastName}`
                      : '—'}
                  </span>

                  {/* Item count */}
                  <span className={`${mono.className} text-[10px] text-white/35`}>
                    {order.items?.length ?? 0}
                  </span>

                  {/* Total */}
                  <span
                    className="text-white/60 text-sm font-medium"
                    style={{ fontFamily: 'var(--font-epilogue)' }}
                  >
                    ${order.totalPrice.toFixed(2)}
                  </span>

                  {/* Date */}
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.1em] text-white/30`}>
                    {formatDate(order.createdAt)}
                  </span>

                  {/* Status */}
                  <div>
                    <StatusPill status={order.status} />
                  </div>

                  {/* Urgency flag */}
                  <div className="w-5 flex items-center justify-center">
                    {urgent && (
                      <span title={`Required by ${formatDate(order.requiredByDate!)}`}>
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

        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/20`}>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === 'ellipsis' ? (
                    <span key={`e-${i}`} className={`${mono.className} w-7 h-7 flex items-center justify-center text-[9px] text-white/15`}>
                      ···
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`${mono.className} w-7 h-7 border text-[9px] transition-colors ${
                        page === n
                          ? 'bg-amber-400 border-amber-400 text-black font-semibold'
                          : 'border-white/10 text-white/30 hover:border-white/25 hover:text-white/60'
                      }`}
                    >
                      {n}
                    </button>
                  )
                )
              }
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}