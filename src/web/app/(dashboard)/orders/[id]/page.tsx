'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ArrowLeft, Package, MapPin, Calendar, FileText, CreditCard, CheckCircle2 } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono  = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Draft:        { dot: 'bg-white/20',       text: 'text-white/30'       },
  Submitted:    { dot: 'bg-sky-400/60',     text: 'text-sky-400/70'     },
  InReview:     { dot: 'bg-sky-400/60',     text: 'text-sky-400/70'     },
  Approved:     { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Printing:     { dot: 'bg-amber-400/60',   text: 'text-amber-400/70'   },
  QualityCheck: { dot: 'bg-amber-400/60',   text: 'text-amber-400/70'   },
  Shipped:      { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Completed:    { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Cancelled:    { dot: 'bg-red-400/60',     text: 'text-red-400/70'     },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { dot: 'bg-white/20', text: 'text-white/30' };
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em] ${s.text}`}>
        {status}
      </span>
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Section({ icon: Icon, title, children }: {
  icon?: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-white/[0.08]" style={{ background: '#080705' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
        {Icon && <Icon className="h-3.5 w-3.5 text-white/20" />}
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/30`}>
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-white/20`}>
        {label}
      </span>
      <span className={`${mono.className} text-[11px] text-white/60 text-right`}>
        {value}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const searchParams = useSearchParams();

  const paymentParam = searchParams.get('payment');
  const initialFlash: { type: 'success' | 'info'; msg: string } | null =
    paymentParam === 'success'    ? { type: 'success', msg: 'Payment successful — your order is approved.' }
    : paymentParam === 'cancelled' ? { type: 'info',    msg: 'Payment cancelled. You can try again when ready.' }
    : null;
  const [flash, setFlash] = useState(initialFlash);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersApi.getById(id),
    enabled:  isAuthenticated,
  });

  const payMutation = useMutation({
    mutationFn: () => ordersApi.createPaymentSession(id),
    onSuccess:  (res) => { window.location.href = res.data.url; },
    onError:    () => setFlash({ type: 'info', msg: 'Failed to start checkout — please try again.' }),
  });

  if (!isInitialized || !isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <p className={`${mono.className} text-[10px] text-red-400`}>Order not found.</p>
        <button
          onClick={() => router.push('/orders')}
          className={`${mono.className} mt-4 text-[9px] uppercase tracking-[0.15em] text-white/25 hover:text-white/50 transition-colors`}
        >
          ← Back to orders
        </button>
      </div>
    );
  }

  const order = data.data;

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/orders')}
          className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-white/25 hover:text-white/50 transition-colors mb-4`}
        >
          <ArrowLeft className="h-3 w-3" />
          All Orders
        </button>

        <div className="flex items-start justify-between">
          <div>
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-400/70 mb-1`}>
              Order
            </p>
            <h1 className={`${bebas.className} text-4xl text-white tracking-wide`}>
              {order.orderNumber}
            </h1>
            <p className={`${mono.className} text-[10px] text-white/25 mt-1`}>
              Placed {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="mt-1">
            <StatusPill status={order.status} />
          </div>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div className={`${mono.className} mb-4 flex items-center gap-2 px-4 py-2.5 text-[10px] border ${
          flash.type === 'success'
            ? 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-400/80'
            : 'border-sky-400/20 bg-sky-400/[0.04] text-sky-400/70'
        }`}>
          {flash.msg}
        </div>
      )}

      <div className="space-y-4">

        {/* Payment CTA */}
        {order.status === 'Submitted' && (
          <div className="border border-amber-400/20 bg-amber-400/[0.03] p-5 flex items-center justify-between gap-4">
            <div>
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-amber-400/80 mb-1`}>
                Payment Required
              </p>
              <p className={`${mono.className} text-[10px] text-white/30 mb-2`}>
                Complete payment to approve your order and begin production.
              </p>
              <p className={`${bebas.className} text-2xl text-white`}>
                ${order.totalPrice.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
              className={`${mono.className} shrink-0 flex items-center gap-2 px-4 h-9 bg-amber-400/10 border border-amber-400/30 text-[9px] uppercase tracking-[0.15em] text-amber-400/80 hover:bg-amber-400/20 hover:text-amber-400 transition-colors disabled:opacity-40`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {payMutation.isPending ? 'Redirecting...' : 'Pay Now'}
            </button>
          </div>
        )}

        {order.status === 'Approved' && (
          <div className="border border-emerald-400/15 bg-emerald-400/[0.03] px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60 shrink-0" />
            <p className={`${mono.className} text-[10px] text-emerald-400/70`}>
              Payment confirmed — order approved and entering production
            </p>
          </div>
        )}

        {/* Items */}
        <Section icon={Package} title={`Items (${order.items.length})`}>
          <div className="space-y-4">
            {order.items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div className="border-t border-white/[0.06] mb-4" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <p className={`${mono.className} text-[11px] text-white/60`}>
                      {item.file?.originalFileName ?? 'Unknown file'}
                    </p>
                    <p className={`${mono.className} text-[9px] text-white/25`}>
                      {item.material ? `${item.material.type} — ${item.material.color}` : '—'}
                      &nbsp;·&nbsp; {item.quality} quality
                      &nbsp;·&nbsp; {item.infill ?? '—'}% infill
                    </p>
                    {item.supportStructures && (
                      <p className={`${mono.className} text-[9px] text-white/20`}>Support structures included</p>
                    )}
                    {item.estimatedWeight && (
                      <p className={`${mono.className} text-[9px] text-white/20`}>
                        Est. weight: {item.estimatedWeight.toFixed(1)} g
                      </p>
                    )}
                    {item.specialInstructions && (
                      <p className={`${mono.className} text-[9px] text-white/20 italic`}>
                        &quot;{item.specialInstructions}&quot;
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`${mono.className} text-[12px] text-white/70`}>
                      ${item.totalPrice.toFixed(2)}
                    </p>
                    <p className={`${mono.className} text-[9px] text-white/20 mt-0.5`}>
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Summary */}
        <Section icon={FileText} title="Order Summary">
          <div className="space-y-0">
            <DataRow label="Subtotal" value={`$${order.items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}`} />
            {order.shippingCost != null && (
              <DataRow label="Shipping" value={`$${order.shippingCost.toFixed(2)}`} />
            )}
            {order.tax != null && (
              <DataRow label="Tax" value={`$${order.tax.toFixed(2)}`} />
            )}
            <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-white/[0.08]">
              <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-white/40`}>Total</span>
              <span className={`${bebas.className} text-xl text-white`}>${order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </Section>

        {/* Dates + Address */}
        <div className="grid grid-cols-2 gap-4">
          <Section icon={Calendar} title="Dates">
            <div className="space-y-0">
              <DataRow label="Ordered"     value={formatDate(order.createdAt)} />
              {order.requiredByDate && <DataRow label="Required by" value={formatDate(order.requiredByDate)} />}
              {order.shippedAt      && <DataRow label="Shipped"     value={formatDate(order.shippedAt)} />}
              {order.completedAt    && <DataRow label="Completed"   value={formatDate(order.completedAt)} />}
            </div>
          </Section>

          {order.shippingAddress && (
            <Section icon={MapPin} title="Ship To">
              <p className={`${mono.className} text-[10px] text-white/40 whitespace-pre-line leading-relaxed`}>
                {order.shippingAddress}
              </p>
            </Section>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <Section icon={FileText} title="Notes">
            <p className={`${mono.className} text-[10px] text-white/40`}>{order.notes}</p>
          </Section>
        )}

      </div>
    </div>
  );
}