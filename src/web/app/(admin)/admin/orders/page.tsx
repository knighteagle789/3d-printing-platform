'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi, type Order, type PagedResponse } from '@/lib/api/orders';
import { JetBrains_Mono } from 'next/font/google';
import { ArrowRight, Package, ChevronLeft, ChevronRight, Search, AlertTriangle } from 'lucide-react';
import { formatStatus } from '@/lib/utils';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const STATUSES = [
  'All',
  'Draft', 'Submitted', 'InReview', 'QuoteProvided', 'Approved',
  'InProduction', 'Printing', 'PostProcessing', 'QualityCheck',
  'Packaging', 'Shipped', 'Delivered', 'Completed',
  'OnHold', 'Cancelled',
];

const STATUS_COLOUR: Record<string, string> = {
  Draft:          'badge-neutral',
  Submitted:      'badge-pending',
  InReview:       'badge-pending',
  QuoteProvided:  'badge-pending',
  Approved:       'badge-success',
  InProduction:   'badge-success',
  Printing:       'badge-success',
  PostProcessing: 'badge-success',
  QualityCheck:   'text-blue-600 bg-blue-50 border-blue-200',
  Packaging:      'badge-success',
  Shipped:        'badge-success',
  Delivered:      'badge-success',
  Completed:      'text-text-secondary bg-surface-alt border-border',
  Cancelled:      'badge-danger',
  OnHold:         'badge-pending',
};

const URGENT_STATUSES = new Set(['Submitted', 'InReview', 'QualityCheck', 'OnHold']);
const DONE_STATUSES   = new Set(['Shipped', 'Delivered', 'Completed', 'Cancelled']);

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isDeadlineUrgent(order: Order): boolean {
  if (!order.requiredByDate) return false;
  if (DONE_STATUSES.has(order.status)) return false;
  const hoursLeft = (new Date(order.requiredByDate).getTime() - Date.now()) / 36e5;
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

export default function AdminOrdersPage() {
  const router  = useRouter();
  const [status, setStatus] = useState<string>('Submitted');
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');

  const handleStatusChange = (s: string) => { setStatus(s); setPage(1); setSearch(''); };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: async (): Promise<PagedResponse<Order>> => {
      if (status === 'All') {
        const r = await ordersApi.getAll({ page, pageSize: 20 });
        return r.data;
      }
      const r = await ordersApi.getByStatus(status, page, 20);
      return r.data;
    },
  });

  const { data: countsData } = useQuery({
    queryKey: ['admin', 'orders', 'status-counts'],
    queryFn:  () => ordersApi.getStatusCounts(),
    staleTime: 30_000,
  });
  const counts = countsData?.data ?? {};

  const orders     = data?.items     ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  const needle = search.trim().toLowerCase();
  const filteredOrders = needle
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(needle) ||
        `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''}`.toLowerCase().includes(needle)
      )
    : orders;

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
            Orders
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted mt-1`}>
            {isLoading ? '—' : `${needle ? filteredOrders.length : totalCount} order${totalCount !== 1 ? 's' : ''}`}
            {status !== 'All' && !needle ? ` · ${formatStatus(status)}` : ''}
            {needle ? ` matching "${search}"` : ''}
          </p>
        </div>
        <div className="relative shrink-0 w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Order # or customer..."
            className={`${mono.className} w-full h-8 bg-surface-alt border border-border pl-8 pr-3 text-[10px] uppercase tracking-[0.1em] text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`}
          />
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
        <div className={`${mono.className} grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 px-6 py-3 border-b border-border bg-surface-alt text-[8px] uppercase tracking-[0.18em] text-text-muted`}>
          <span>Order</span><span>Customer</span><span>Items</span><span>Total</span>
          <span>Date</span><span>Status</span><span className="w-5" /><span className="w-6" />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3 bg-surface-alt animate-pulse w-32" />
                <div className="h-3 bg-surface-alt animate-pulse w-40" />
                <div className="h-3 bg-surface-alt animate-pulse w-8" />
                <div className="h-3 bg-surface-alt animate-pulse w-16" />
                <div className="h-3 bg-surface-alt animate-pulse w-24" />
                <div className="h-5 bg-surface-alt animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-6 w-6 text-text-muted mx-auto mb-3" />
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted`}>
              {needle ? `No orders matching "${search}"` : `No ${status !== 'All' ? formatStatus(status).toLowerCase() : ''} orders`}
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
                  className={`grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_1.5fr_auto_auto] gap-4 items-center px-6 py-4 cursor-pointer hover:bg-surface-alt transition-colors group ${
                    i < filteredOrders.length - 1 ? 'border-b border-border' : ''
                  } ${urgent ? 'bg-amber-50' : ''}`}
                >
                  <span className="text-text-primary text-sm font-medium truncate" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {order.orderNumber}
                  </span>
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.12em] text-text-muted truncate`}>
                    {order.user ? `${order.user.firstName} ${order.user.lastName}` : '—'}
                  </span>
                  <span className={`${mono.className} text-[10px] text-text-muted`}>{order.items?.length ?? 0}</span>
                  <span className="text-text-secondary text-sm font-medium" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    ${order.totalPrice.toFixed(2)}
                  </span>
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.1em] text-text-muted`}>
                    {formatDate(order.createdAt)}
                  </span>
                  <div><StatusPill status={order.status} /></div>
                  <div className="w-5 flex items-center justify-center">
                    {urgent && (
                      <span title={`Required by ${formatDate(order.requiredByDate!)}`}>
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