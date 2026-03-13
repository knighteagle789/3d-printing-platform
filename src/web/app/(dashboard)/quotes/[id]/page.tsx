'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesApi } from '@/lib/api/quotes';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ArrowLeft, FileText, Calendar, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono  = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Pending:       { dot: 'bg-gray-300',       text: 'text-text-muted'       },
  UnderReview:   { dot: 'bg-sky-500',     text: 'text-sky-700'     },
  QuoteProvided: { dot: 'bg-amber-500',   text: 'text-amber-700'   },
  Accepted:      { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  Expired:       { dot: 'bg-red-500',     text: 'text-red-600'     },
  Cancelled:     { dot: 'bg-red-500',     text: 'text-red-600'     },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { dot: 'bg-gray-300', text: 'text-text-muted' };
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
    <div className="border border-border bg-surface" >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        {Icon && <Icon className="h-3.5 w-3.5 text-text-muted" />}
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-text-muted`}>{label}</span>
      <span className={`${mono.className} text-[11px] text-text-secondary text-right max-w-[60%]`}>{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }       = use(params);
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Confirm state for accept (avoids browser confirm())
  const [pendingAccept, setPendingAccept] = useState<string | null>(null);
  const [pendingConvert, setPendingConvert] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quotes', id],
    queryFn:  () => quotesApi.getById(id),
    enabled:  isAuthenticated,
  });

  const acceptMutation = useMutation({
    mutationFn: (responseId: string) => quotesApi.acceptResponse(id, responseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setPendingAccept(null);
      setFlash({ type: 'success', msg: 'Quote accepted — you can now proceed to place your order.' });
    },
    onError: () => {
      setPendingAccept(null);
      setFlash({ type: 'error', msg: 'Failed to accept quote — please try again.' });
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => quotesApi.convertToOrder(id),
    onSuccess: (res) => {
      router.push(`/orders/${res.data.id}`);
    },
    onError: () => {
      setPendingConvert(false);
      setFlash({ type: 'error', msg: 'Failed to convert quote — please try again.' });
    },
  });

  if (!isInitialized || !isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <p className={`${mono.className} text-[10px] text-red-400`}>Quote request not found.</p>
        <button
          onClick={() => router.push('/quotes')}
          className={`${mono.className} mt-4 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors`}
        >
          ← Back to quotes
        </button>
      </div>
    );
  }

  const quote = data.data;

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/quotes')}
          className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors mb-4`}
        >
          <ArrowLeft className="h-3 w-3" />
          All Quotes
        </button>

        <div className="flex items-start justify-between">
          <div>
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-700 mb-1`}>
              Quote Request
            </p>
            <h1 className={`${bebas.className} text-4xl text-text-primary tracking-wide`}>
              {quote.requestNumber}
            </h1>
            <p className={`${mono.className} text-[10px] text-text-muted mt-1`}>
              Submitted {formatDate(quote.createdAt)}
            </p>
          </div>
          <div className="mt-1">
            <StatusPill status={quote.status} />
          </div>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div className={`${mono.className} mb-4 border px-4 py-2.5 text-[10px] ${
          flash.type === 'success'
            ? 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-700'
            : 'border-red-400/20 bg-red-400/[0.04] text-red-600'
        }`}>
          {flash.msg}
        </div>
      )}

      <div className="space-y-4">

        {/* Request details */}
        <Section icon={FileText} title="Request Details">
          <div className="space-y-0">
            {quote.file && <DataRow label="File" value={quote.file.originalFileName} />}
            <DataRow label="Quantity" value={quote.quantity} />
            {quote.preferredMaterial && (
              <DataRow label="Preferred Material" value={`${quote.preferredMaterial.type} — ${quote.preferredMaterial.color}`} />
            )}
            {quote.budgetDisplay && <DataRow label="Budget" value={quote.budgetDisplay} />}
            {quote.specialRequirements && (
              <DataRow label="Special Requirements" value={quote.specialRequirements} />
            )}
          </div>
        </Section>

        {/* Dates */}
        <Section icon={Calendar} title="Dates">
          <div className="space-y-0">
            <DataRow label="Submitted"   value={formatDate(quote.createdAt)} />
            {quote.requiredByDate && (
              <DataRow label="Required by" value={formatDate(quote.requiredByDate)} />
            )}
          </div>
        </Section>

        {/* Responses */}
        <Section icon={MessageSquare} title={`Pricing Responses (${quote.responses.length})`}>
          {quote.responses.length === 0 ? (
            <p className={`${mono.className} text-[10px] text-text-muted`}>
              No responses yet — we&apos;ll review your request and reply shortly.
            </p>
          ) : (
            <div className="space-y-5">
              {quote.responses.map((response, i) => (
                <div key={response.id}>
                  {i > 0 && <div className="border-t border-border mb-5" />}

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-3">
                        <span className={`${bebas.className} text-2xl ${response.isAccepted ? 'text-emerald-400' : 'text-text-primary'}`}>
                          ${response.price.toFixed(2)}
                        </span>
                        {response.shippingCost != null && (
                          <span className={`${mono.className} text-[9px] text-text-muted`}>
                            + ${response.shippingCost.toFixed(2)} shipping
                          </span>
                        )}
                      </div>
                      <p className={`${mono.className} text-[9px] text-text-muted`}>
                        Estimated {response.estimatedDays} days
                      </p>
                      {response.recommendedMaterial && (
                        <p className={`${mono.className} text-[9px] text-text-muted`}>
                          Recommended: {response.recommendedMaterial.type} — {response.recommendedMaterial.color}
                        </p>
                      )}
                      {response.technicalNotes && (
                        <p className={`${mono.className} text-[10px] text-text-secondary mt-1`}>
                          {response.technicalNotes}
                        </p>
                      )}
                      <p className={`${mono.className} text-[8px] text-text-muted`}>
                        Expires {formatDate(response.expiresAt)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {response.isAccepted ? (
                        <span className={`${mono.className} flex items-center gap-1.5 text-[9px] text-emerald-700`}>
                          <CheckCircle2 className="h-3 w-3" />
                          Accepted
                        </span>
                      ) : quote.status === 'QuoteProvided' && (
                        pendingAccept === response.id ? (
                          <div className="flex items-center gap-2">
                            <span className={`${mono.className} text-[9px] text-text-muted`}>Confirm?</span>
                            <button
                              onClick={() => acceptMutation.mutate(response.id)}
                              disabled={acceptMutation.isPending}
                              className={`${mono.className} px-3 h-7 bg-emerald-500 border border-emerald-400/30 text-[8px] uppercase tracking-[0.12em] text-emerald-700 hover:bg-emerald-500 transition-colors disabled:opacity-40`}
                            >
                              {acceptMutation.isPending ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setPendingAccept(null)}
                              className={`${mono.className} px-3 h-7 border border-border text-[8px] uppercase tracking-[0.12em] text-text-muted hover:text-text-secondary transition-colors`}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingAccept(response.id)}
                            className={`${mono.className} px-3 h-8 border border-amber-400/20 bg-amber-400/[0.03] hover:border-amber-400/40 hover:bg-amber-400/[0.07] text-[8px] uppercase tracking-[0.12em] text-amber-700 hover:text-amber-700 transition-colors`}
                          >
                            Accept Quote
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Convert to order */}
        {quote.status === 'Accepted' && !quote.orderId && (
          <div className="border border-amber-400/20 bg-amber-400/[0.03] p-5 flex items-center justify-between gap-4">
            <div>
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-amber-700 mb-1`}>
                Ready to Order?
              </p>
              <p className={`${mono.className} text-[10px] text-text-muted`}>
                Your quote is accepted. Create an order to begin production.
              </p>
            </div>

            {pendingConvert ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className={`${mono.className} text-[9px] text-text-muted`}>Confirm?</span>
                <button
                  onClick={() => convertMutation.mutate()}
                  disabled={convertMutation.isPending}
                  className={`${mono.className} px-3 h-8 bg-amber-500 border border-amber-400/30 text-[8px] uppercase tracking-[0.12em] text-amber-700 hover:bg-amber-500 transition-colors disabled:opacity-40`}
                >
                  {convertMutation.isPending ? '...' : 'Create'}
                </button>
                <button
                  onClick={() => setPendingConvert(false)}
                  className={`${mono.className} px-3 h-8 border border-border text-[8px] uppercase tracking-[0.12em] text-text-muted hover:text-text-secondary transition-colors`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPendingConvert(true)}
                className={`${mono.className} shrink-0 flex items-center gap-2 px-4 h-9 bg-amber-500 border border-amber-400/30 text-[9px] uppercase tracking-[0.15em] text-amber-700 hover:bg-amber-500 hover:text-accent transition-colors`}
              >
                Create Order
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {quote.status === 'Accepted' && quote.orderId && (
          <div className="border border-border p-4 flex items-center justify-between">
            <div>
              <p className={`${mono.className} text-[10px] text-text-secondary mb-0.5`}>Order Created</p>
              <p className={`${mono.className} text-[9px] text-text-muted`}>
                This quote has been converted to an order.
              </p>
            </div>
            <button
              onClick={() => router.push(`/orders/${quote.orderId}`)}
              className={`${mono.className} flex items-center gap-2 px-3 h-8 border border-border text-[9px] uppercase tracking-[0.12em] text-text-muted hover:text-text-secondary hover:border-border transition-colors`}
            >
              View Order
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <Section icon={FileText} title="Notes">
            <p className={`${mono.className} text-[10px] text-text-secondary`}>{quote.notes}</p>
          </Section>
        )}

      </div>
    </div>
  );
}