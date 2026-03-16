'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { Package } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono  = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Draft:        { dot: 'bg-white/20',       text: 'text-white/30'    },
  Submitted:    { dot: 'bg-sky-400/60',     text: 'text-sky-400/70'  },
  InReview:     { dot: 'bg-sky-400/60',     text: 'text-sky-400/70'  },
  Approved:     { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Printing:     { dot: 'bg-amber-400/60',   text: 'text-amber-400/70'  },
  QualityCheck: { dot: 'bg-amber-400/60',   text: 'text-amber-400/70'  },
  Shipped:      { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Completed:    { dot: 'bg-emerald-400/60', text: 'text-emerald-400/70' },
  Cancelled:    { dot: 'bg-red-400/60',     text: 'text-red-400/70'    },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { dot: 'bg-white/20', text: 'text-white/30' };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.12em] ${s.text}`}>
        {status}
      </span>
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const [flash] = useState<string | null>(
    searchParams.get('created') ? 'Order placed successfully.' : null
  );
  // Clean up the ?created= param once on mount without triggering a cascade
  if (searchParams.get('created') && typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/orders');
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn:  () => ordersApi.getMine(),
    enabled:  isAuthenticated,
  });

  if (!isInitialized || !isAuthenticated) return null;

  const orders = data?.data.items ?? [];

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8">
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-400/70 mb-2`}>
          Orders
        </p>
        <h1 className={`${bebas.className} text-4xl text-white tracking-wide`}>
          My Orders
        </h1>
        <p className={`${mono.className} text-[11px] text-white/30 mt-1`}>
          Track and manage your 3D printing orders
        </p>
      </div>

      {/* Flash */}
      {flash && (
        <div className={`${mono.className} mb-4 flex items-center gap-2 border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-2.5 text-[10px] text-emerald-400/80`}>
          {flash}
        </div>
      )}

      {/* Table */}
      <div className="border border-white/[0.08]">
        {/* Column headers */}
        <div
          className="grid px-4 py-2.5 border-b border-white/[0.06]"
          style={{ background: '#080705', gridTemplateColumns: '1fr 1fr 4rem 6rem 7rem' }}
        >
          {['Order #', 'Date', 'Items', 'Total', 'Status'].map(h => (
            <span key={h} className={`${mono.className} text-[8px] uppercase tracking-[0.18em] text-white/20`}>
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
            Failed to load orders — please refresh.
          </p>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Package className="h-8 w-8 text-white/10 mx-auto mb-3" />
            <p className={`${mono.className} text-[10px] text-white/25`}>
              No orders yet — upload a model to get started.
            </p>
          </div>
        )}

        {orders.map((order, i) => (
          <div
            key={order.id}
            onClick={() => router.push(`/orders/${order.id}`)}
            className={`grid items-center px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors group ${i < orders.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            style={{ gridTemplateColumns: '1fr 1fr 4rem 6rem 7rem' }}
          >
            <span className={`${mono.className} text-[11px] text-white/60 group-hover:text-white transition-colors`}>
              {order.orderNumber}
            </span>
            <span className={`${mono.className} text-[10px] text-white/30`}>
              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className={`${mono.className} text-[10px] text-white/30`}>
              {order.items.length}
            </span>
            <span className={`${mono.className} text-[11px] text-white/60`}>
              ${order.totalPrice.toFixed(2)}
            </span>
            <StatusPill status={order.status} />
          </div>
        ))}
      </div>
    </div>
  );
}