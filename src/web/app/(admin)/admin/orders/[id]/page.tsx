'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi, type OrderStatusHistory } from '@/lib/api/orders';
import { JetBrains_Mono } from 'next/font/google';
import { formatStatus } from '@/lib/utils';
import {
  ArrowLeft, Package, Calendar, MapPin, Clock,
  CheckCircle2, AlertCircle, User, Download, Mail,
} from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  Draft:          'badge-neutral',
  Submitted:      'badge-pending',
  InReview:       'badge-pending',
  QuoteProvided:  'badge-pending',
  Approved:       'badge-success',
  InProduction:   'badge-success',
  Printing:       'badge-success',
  PostProcessing: 'badge-success',
  QualityCheck:   'text-blue-400 bg-blue-400/8 border-blue-400/20',
  Packaging:      'badge-success',
  Shipped:        'badge-success',
  Delivered:      'badge-success',
  Completed:      'text-text-secondary bg-surface-alt border-border',
  Cancelled:      'badge-danger',
  OnHold:         'badge-pending',
};

// Valid transitions matching backend logic
const NEXT_STATUSES: Record<string, string[]> = {
  Draft:          ['Submitted', 'Cancelled'],
  Submitted:      ['InReview', 'Cancelled'],
  InReview:       ['QuoteProvided', 'Approved', 'Cancelled', 'OnHold'],
  QuoteProvided:  ['Approved', 'Cancelled'],
  Approved:       ['InProduction', 'Cancelled', 'OnHold'],
  InProduction:   ['Printing', 'OnHold'],
  Printing:       ['PostProcessing', 'OnHold'],
  PostProcessing: ['QualityCheck'],
  QualityCheck:   ['Packaging', 'Printing'],
  Packaging:      ['Shipped'],
  Shipped:        ['Delivered'],
  Delivered:      ['Completed'],
  OnHold:         ['InReview', 'Approved', 'InProduction', 'Cancelled'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const DONE_STATUSES = new Set(['Shipped', 'Delivered', 'Completed', 'Cancelled']);

function isDeadlineUrgent(requiredByDate: string | null, status: string): boolean {
  if (!requiredByDate) return false;
  if (DONE_STATUSES.has(status)) return false;
  const hoursLeft = (new Date(requiredByDate).getTime() - Date.now()) / 36e5;
  return hoursLeft <= 48;
}



function StatusPill({ status, large }: { status: string; large?: boolean }) {
  const colours = STATUS_COLOUR[status] ?? 'badge-neutral';
  return (
    <span className={`${mono.className} inline-flex items-center border uppercase tracking-[0.15em] ${
      large ? 'text-[10px] px-3 py-1' : 'text-[8px] px-2 py-0.5'
    } ${colours}`}>
      {formatStatus(status)}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted mb-4`}>
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }      = use(params);
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [newStatus,  setNewStatus]  = useState('');
  const [notes,      setNotes]      = useState('');
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn:  () => ordersApi.getById(id),
  });

  const mutation = useMutation({
    mutationFn: () => ordersApi.updateStatus(id, newStatus, notes || undefined),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setNewStatus('');
      setNotes('');
      showToast(`Order moved to ${formatStatus(res.data.status)}`, true);
    },
    onError: () => showToast('Failed to update status.', false),
  });

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-6 bg-surface-alt animate-pulse w-32" />
        <div className="h-24 bg-surface-alt animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--page-bg)] h-40" />
          ))}
        </div>
      </div>
    );
  }

  const order = data?.data;
  if (!order) return null;

  const availableTransitions = NEXT_STATUSES[order.status] ?? [];

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 border ${
          toast.ok
            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
            : 'bg-red-500 border-red-200 text-red-400'
        }`}>
          {toast.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
            {toast.msg}
          </span>
        </div>
      )}

      {/* ── Back link ── */}
      <button
        onClick={() => router.push('/admin/orders')}
        className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-text-primary transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Back to Orders
      </button>

      {/* ── Urgency banner ── */}
      {isDeadlineUrgent(order.requiredByDate, order.status) && (
        <div className="flex items-center gap-3 px-5 py-3.5 border border-amber-200 bg-amber-50.05]">
          <AlertCircle className="h-4 w-4 text-accent shrink-0" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-accent`}>
            Required by {formatDate(order.requiredByDate)} — deadline within 48 hours
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1
            className="page-title mb-2"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            {order.orderNumber}
          </h1>
          <div className={`${mono.className} flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown'}
            </span>
            {order.user?.email && (
              <>
                <span className="text-text-muted">·</span>
                <a
                  href={`mailto:${order.user.email}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-text-muted hover:text-accent transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  {order.user.email}
                </a>
              </>
            )}
            <span className="text-text-muted">·</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </div>
        <StatusPill status={order.status} large />
      </div>

      {/* ── Status update panel ── */}
      {availableTransitions.length > 0 && (
        <div className="border border-amber-200 bg-amber-50.03] p-6">
          <SectionLabel>Update Status</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-4">
            {availableTransitions.map((s) => {
              const active = newStatus === s;
              const isDanger = s === 'Cancelled';
              return (
                <button
                  key={s}
                  onClick={() => setNewStatus(active ? '' : s)}
                  className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-4 h-8 border transition-colors ${
                    active
                      ? isDanger
                        ? 'bg-red-400 border-red-400 text-black'
                        : 'bg-accent border-accent text-black font-semibold'
                      : isDanger
                        ? 'text-red-600 border-red-200 hover:border-red-200 hover:text-red-400'
                        : 'text-text-secondary border-border hover:border-border hover:text-text-primary'
                  }`}
                >
                  {formatStatus(s)}
                </button>
              );
            })}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note (optional)..."
            rows={2}
            className={`${mono.className} w-full bg-surface-alt border border-border text-text-primary placeholder:text-text-muted text-[10px] px-4 py-3 resize-none focus:outline-none focus:border-accent transition-colors`}
          />
          <button
            disabled={!newStatus || mutation.isPending}
            onClick={() => mutation.mutate()}
            className={`${mono.className} mt-3 inline-flex items-center gap-2 bg-accent-light text-accent-dark text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-9 hover:bg-amber-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {mutation.isPending ? 'Updating...' : `Move to ${newStatus ? formatStatus(newStatus) : '...'}`}
          </button>
        </div>
      )}

      {/* ── Main grid: items + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-px bg-border">

        {/* Items */}
        <div className="bg-[var(--page-bg)] p-6">
          <SectionLabel>
            <span className="flex items-center gap-2">
              <Package className="h-3 w-3" />
              Items ({order.items.length})
            </span>
          </SectionLabel>

          <div className="space-y-px bg-border">
            {order.items.map((item) => (
              <div key={item.id} className="bg-[var(--page-bg)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-3">
                      <p
                        className="text-text-primary font-medium truncate"
                        style={{ fontFamily: 'var(--font-epilogue)' }}
                      >
                        {item.file?.originalFileName ?? 'Unknown file'}
                      </p>
                      {item.file?.storageUrl && (
                        <a
                          href={item.file.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 flex items-center gap-1 text-text-muted hover:text-accent transition-colors"
                          title="Download file"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className={`${mono.className} flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.12em] text-text-muted`}>
                      {item.material && (
                        <span>{item.material.type} · {item.material.color}</span>
                      )}
                      <span>{item.quality}</span>
                      <span>{item.infill ?? 20}% infill</span>
                      {item.supportStructures && <span>Supports</span>}
                      {item.color && <span>Color: {item.color}</span>}
                      {item.estimatedWeight && (
                        <span>{item.estimatedWeight.toFixed(1)}g est.</span>
                      )}
                    </div>
                    {item.specialInstructions && (
                      <p className={`${mono.className} text-[9px] text-text-muted italic`}>
                        &quot;{item.specialInstructions}&quot;
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-text-primary font-medium"
                      style={{ fontFamily: 'var(--font-epilogue)' }}
                    >
                      ${item.totalPrice.toFixed(2)}
                    </p>
                    <p className={`${mono.className} text-[9px] uppercase tracking-[0.1em] text-text-muted mt-0.5`}>
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {order.shippingCost != null && (
              <div className={`${mono.className} flex justify-between text-[10px] uppercase tracking-[0.15em] text-text-muted`}>
                <span>Shipping</span>
                <span>${order.shippingCost.toFixed(2)}</span>
              </div>
            )}
            {order.tax != null && (
              <div className={`${mono.className} flex justify-between text-[10px] uppercase tracking-[0.15em] text-text-muted`}>
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-text-secondary`}>
                Total
              </span>
              <span
                className="text-text-primary font-black"
                style={{ fontFamily: 'var(--font-epilogue)', fontSize: '1.4rem' }}
              >
                ${order.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-[var(--page-bg)] divide-y divide-border">

          {/* Dates */}
          <div className="p-6">
            <SectionLabel>
              <span className="flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Dates
              </span>
            </SectionLabel>
            <div className="space-y-3">
              {[
                { label: 'Ordered',     value: formatDate(order.createdAt) },
                { label: 'Required by', value: formatDate(order.requiredByDate) },
                { label: 'Shipped',     value: formatDate(order.shippedAt) },
                { label: 'Completed',   value: formatDate(order.completedAt) },
              ].filter(r => r.value !== '—').map(({ label, value }) => (
                <div key={label} className="flex justify-between items-baseline gap-2">
                  <span className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-text-muted`}>
                    {label}
                  </span>
                  <span className={`${mono.className} text-[10px] text-text-secondary text-right`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping address */}
          {order.shippingAddress && (
            <div className="p-6">
              <SectionLabel>
                <span className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Ship To
                </span>
              </SectionLabel>
              <p className={`${mono.className} text-[10px] leading-relaxed text-text-secondary whitespace-pre-line`}>
                {order.shippingAddress}
              </p>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="p-6">
              <SectionLabel>Notes</SectionLabel>
              <p className={`${mono.className} text-[10px] leading-relaxed text-text-secondary`}>
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Status history ── */}
      <div className="border border-border">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          <span className={`${mono.className} text-[10px] uppercase tracking-[0.2em] text-text-secondary`}>
            Status History
          </span>
        </div>
        <div className="p-6">
          <StatusHistory orderId={id} monoClass={mono.className} />
        </div>
      </div>

    </div>
  );
}

// ─── Status History ───────────────────────────────────────────────────────────

function StatusHistory({ orderId, monoClass }: { orderId: string; monoClass: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'order', orderId, 'history'],
    queryFn:  () => ordersApi.getHistory(orderId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-2 h-2 bg-surface-alt animate-pulse mt-1 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 bg-surface-alt animate-pulse w-24" />
              <div className="h-2 bg-surface-alt animate-pulse w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const history: OrderStatusHistory[] = data?.data ?? [];

  if (history.length === 0) {
    return (
      <p className={`${monoClass} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
        No history yet
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => (
        <div key={entry.id} className="flex gap-5">
          {/* Timeline spine */}
          <div className="flex flex-col items-center">
            <div className={`w-1.5 h-1.5 border mt-1 shrink-0 ${
              i === 0 ? 'bg-accent border-accent' : 'bg-gray-300 border-border'
            }`} />
            {i < history.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>

          {/* Content */}
          <div className={`pb-5 ${i === history.length - 1 ? 'pb-0' : ''}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-text-primary font-medium text-sm"
                style={{ fontFamily: 'var(--font-epilogue)' }}
              >
                {formatStatus(entry.status)}
              </span>
              {i === 0 && (
                <span className={`${monoClass} text-[8px] uppercase tracking-[0.15em] text-accent`}>
                  Current
                </span>
              )}
            </div>
            {entry.notes && (
              <p className={`${monoClass} text-[10px] text-text-muted mb-1`}>
                {entry.notes}
              </p>
            )}
            <p className={`${monoClass} text-[9px] uppercase tracking-[0.12em] text-text-muted`}>
              {formatDateTime(entry.changedAt)}
              {entry.changedBy && ` · ${entry.changedBy.firstName} ${entry.changedBy.lastName}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}