'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi, type OrderStatusHistory } from '@/lib/api/orders';
import { mono } from '@/lib/fonts';
import { formatStatus } from '@/lib/utils';

interface StatusTimelineProps {
  orderId: string;
  /** Pass 'admin' to scope the query key under the admin cache namespace. */
  queryNamespace?: 'customer' | 'admin';
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_DOT: Record<string, string> = {
  Draft:        'bg-gray-300   border-gray-300',
  Submitted:    'bg-sky-400    border-sky-400',
  InReview:     'bg-sky-400    border-sky-400',
  Approved:     'bg-emerald-500 border-emerald-500',
  InProduction: 'bg-amber-400  border-amber-400',
  Printing:     'bg-amber-400  border-amber-400',
  PostProcessing: 'bg-amber-400 border-amber-400',
  QualityCheck: 'bg-amber-400  border-amber-400',
  Packaging:    'bg-amber-400  border-amber-400',
  Shipped:      'bg-emerald-500 border-emerald-500',
  Delivered:    'bg-emerald-500 border-emerald-500',
  Completed:    'bg-emerald-500 border-emerald-500',
  Cancelled:    'bg-red-400    border-red-400',
};

export function StatusTimeline({ orderId, queryNamespace = 'customer' }: StatusTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: [queryNamespace, 'order', orderId, 'history'],
    queryFn:  () => ordersApi.getHistory(orderId),
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-5">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-1.5 h-1.5 bg-surface-alt animate-pulse mt-1" />
              {i < 2 && <div className="w-px flex-1 bg-border mt-1 min-h-[2rem]" />}
            </div>
            <div className="space-y-1.5 pb-5">
              <div className="h-3 bg-surface-alt animate-pulse w-24 rounded-sm" />
              <div className="h-2 bg-surface-alt animate-pulse w-40 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const history: OrderStatusHistory[] = [...(data?.data ?? [])].reverse();

  if (history.length === 0) {
    return (
      <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
        No history yet
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const isLatest = i === 0;
        const dotClass = STATUS_DOT[entry.status] ?? 'bg-gray-300 border-gray-300';

        return (
          <div key={entry.id} className="flex gap-5">
            {/* Spine */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-1.5 h-1.5 border mt-1 shrink-0 ${
                isLatest ? dotClass : 'bg-gray-200 border-border'
              }`} />
              {i < history.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1 min-h-[1.5rem]" />
              )}
            </div>

            {/* Content */}
            <div className={`${i < history.length - 1 ? 'pb-5' : 'pb-0'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-text-primary font-medium text-sm"
                  style={{ fontFamily: 'var(--font-epilogue)' }}
                >
                  {formatStatus(entry.status)}
                </span>
                {isLatest && (
                  <span className={`${mono.className} text-[8px] uppercase tracking-[0.15em] text-accent`}>
                    Current
                  </span>
                )}
              </div>

              {entry.notes && (
                <p className={`${mono.className} text-[10px] text-text-muted mb-1`}>
                  {entry.notes}
                </p>
              )}

              <p className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-text-muted`}>
                {formatDateTime(entry.changedAt)}
                {entry.changedBy && (
                  <span className="text-text-muted/60">
                    {' · '}{entry.changedBy.firstName} {entry.changedBy.lastName}
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}