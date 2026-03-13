'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { quotesApi } from '@/lib/api/quotes';
import { materialsApi } from '@/lib/api/materials';
import { JetBrains_Mono } from 'next/font/google';
import {
  ArrowLeft, FileText, Calendar, DollarSign,
  CheckCircle2, AlertCircle, User, Mail, Download, Clock,
} from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  Pending:       'text-amber-400 bg-amber-400/8 border-amber-400/20',
  UnderReview:   'text-amber-400 bg-amber-400/8 border-amber-400/20',
  QuoteProvided: 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Accepted:      'text-emerald-400 bg-emerald-400/8 border-emerald-400/20',
  Expired:       'text-red-400 bg-red-400/8 border-red-400/20',
  Cancelled:     'text-red-400 bg-red-400/8 border-red-400/20',
};

// ─── Validation schema ────────────────────────────────────────────────────────

const responseSchema = z.object({
  price:                 z.number().min(0.01, 'Price is required'),
  shippingCost:          z.number().min(0).optional(),
  estimatedDays:         z.number().int().min(1, 'Estimated days is required'),
  recommendedMaterialId: z.string().optional(),
  recommendedColor:      z.string().optional(),
  technicalNotes:        z.string().optional(),
  alternativeOptions:    z.string().optional(),
  expiresInDays:         z.number().int().min(1).max(90),
});

type ResponseFormValues = z.infer<typeof responseSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isDeadlineUrgent(requiredByDate: string | null, status: string): boolean {
  if (!requiredByDate) return false;
  if (status === 'Accepted' || status === 'Cancelled' || status === 'Expired') return false;
  const hoursLeft = (new Date(requiredByDate).getTime() - Date.now()) / 36e5;
  return hoursLeft <= 48;
}

function StatusPill({ status }: { status: string }) {
  const colours = STATUS_COLOUR[status] ?? 'text-white/30 bg-white/[0.04] border-white/8';
  return (
    <span className={`${mono.className} inline-flex items-center border text-[10px] uppercase tracking-[0.15em] px-3 py-1 ${colours}`}>
      {status}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/25 mb-4`}>
      {children}
    </p>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-white/25 shrink-0`}>
        {label}
      </span>
      <span className={`${mono.className} text-[10px] text-white/55 text-right`}>
        {value}
      </span>
    </div>
  );
}

function StyledFormField({
  label, optional, error, children,
}: {
  label: string; optional?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className={`${mono.className} flex items-baseline gap-2 text-[9px] uppercase tracking-[0.18em] text-white/40`}>
        {label}
        {optional && <span className="text-white/20">optional</span>}
      </label>
      {children}
      {error && (
        <p className={`${mono.className} text-[9px] text-red-400`}>{error}</p>
      )}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`${mono.className} w-full h-9 bg-white/[0.03] border border-white/10 px-3 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors ${className}`}
      {...rest}
    />
  );
}

function TextareaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${mono.className} w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors resize-none`}
      {...props}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }      = use(params);
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quote', id],
    queryFn:  () => quotesApi.getById(id),
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn:  () => materialsApi.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResponseFormValues>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      price:         0,
      estimatedDays: 5,
      expiresInDays: 14,
      shippingCost:  0,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ResponseFormValues) =>
      quotesApi.addResponse(id, {
        price:                 values.price,
        shippingCost:          values.shippingCost,
        estimatedDays:         values.estimatedDays,
        recommendedMaterialId: values.recommendedMaterialId || undefined,
        recommendedColor:      values.recommendedColor || undefined,
        technicalNotes:        values.technicalNotes || undefined,
        alternativeOptions:    values.alternativeOptions || undefined,
        expiresInDays:         values.expiresInDays,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quote', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'quotes'] });
      reset({ price: 0, estimatedDays: 5, expiresInDays: 14, shippingCost: 0 });
      showToast('Quote response sent to customer.', true);
    },
    onError: () => showToast('Failed to send quote response.', false),
  });

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-6 bg-white/[0.05] animate-pulse w-32" />
        <div className="h-24 bg-white/[0.04] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#0d0a06] h-48" />
          ))}
        </div>
      </div>
    );
  }

  const quote      = data?.data;
  if (!quote) return null;

  const materials  = materialsData?.data ?? [];
  const canRespond = quote.status !== 'Accepted' && quote.status !== 'Cancelled';
  const urgent     = isDeadlineUrgent(quote.requiredByDate, quote.status);

  // QuoteRequest.user only has firstName/lastName — email not in type but
  // may be present depending on backend response. Cast safely.
  const userEmail = (quote.user as { email?: string } | null)?.email;

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 border ${
          toast.ok
            ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
            : 'bg-red-400/10 border-red-400/30 text-red-400'
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
        onClick={() => router.push('/admin/quotes')}
        className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/25 hover:text-white transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Back to Quotes
      </button>

      {/* ── Urgency banner ── */}
      {urgent && (
        <div className="flex items-center gap-3 px-5 py-3.5 border border-amber-400/30 bg-amber-400/[0.05]">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-amber-400`}>
            Required by {formatDate(quote.requiredByDate)} — deadline within 48 hours
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1
            className="font-black tracking-tight leading-[1.1] text-white mb-2"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            {quote.requestNumber}
          </h1>
          <div className={`${mono.className} flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-white/30`}>
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {quote.user ? `${quote.user.firstName} ${quote.user.lastName}` : 'Unknown'}
            </span>
            {userEmail && (
              <>
                <span className="text-white/12">·</span>
                <a
                  href={`mailto:${userEmail}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  {userEmail}
                </a>
              </>
            )}
            <span className="text-white/12">·</span>
            <span>Submitted {formatDateTime(quote.createdAt)}</span>
          </div>
        </div>
        <StatusPill status={quote.status} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-px bg-white/8">

        {/* Request details */}
        <div className="bg-[#0d0a06] p-6">
          <SectionLabel>
            <span className="flex items-center gap-2">
              <FileText className="h-3 w-3" /> Request Details
            </span>
          </SectionLabel>

          <div className="space-y-3">
            {/* File with download */}
            <div className="flex justify-between items-center gap-4">
              <span className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-white/25 shrink-0`}>
                File
              </span>
              <div className="flex items-center gap-2">
                <span className={`${mono.className} text-[10px] text-white/55 truncate max-w-[200px]`}>
                  {quote.file?.originalFileName ?? '—'}
                </span>
                {(quote.file as { storageUrl?: string } | null)?.storageUrl && (
                  <a
                    href={(quote.file as { storageUrl: string }).storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/20 hover:text-amber-400 transition-colors shrink-0"
                    title="Download file"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <FieldRow label="Quantity"          value={quote.quantity} />
            <FieldRow
              label="Preferred Material"
              value={quote.preferredMaterial
                ? `${quote.preferredMaterial.type} · ${quote.preferredMaterial.color}`
                : 'No preference'}
            />
            <FieldRow label="Preferred Color"   value={quote.preferredColor ?? 'No preference'} />
            <FieldRow label="Budget"            value={quote.budgetDisplay ?? '—'} />
            <FieldRow
              label="Required By"
              value={
                <span className={urgent ? 'text-amber-400' : ''}>
                  {formatDate(quote.requiredByDate)}
                </span>
              }
            />
          </div>

          {(quote.specialRequirements || quote.notes) && (
            <div className="mt-5 pt-5 border-t border-white/8 space-y-4">
              {quote.specialRequirements && (
                <div>
                  <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1.5`}>
                    Special Requirements
                  </p>
                  <p className={`${mono.className} text-[10px] leading-relaxed text-white/45`}>
                    {quote.specialRequirements}
                  </p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/25 mb-1.5`}>
                    Notes
                  </p>
                  <p className={`${mono.className} text-[10px] leading-relaxed text-white/45`}>
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="bg-[#0d0a06] divide-y divide-white/8">
          <div className="p-6">
            <SectionLabel>
              <span className="flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Timeline
              </span>
            </SectionLabel>
            <div className="space-y-3">
              <FieldRow label="Submitted"   value={formatDate(quote.createdAt)} />
              <FieldRow label="Required By" value={formatDate(quote.requiredByDate)} />
              <FieldRow label="Responses"   value={quote.responses.length} />
            </div>
          </div>

          {quote.orderId && (
            <div className="p-6">
              <SectionLabel>Linked Order</SectionLabel>
              <button
                onClick={() => router.push(`/admin/orders/${quote.orderId}`)}
                className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-amber-400 hover:text-amber-300 transition-colors`}
              >
                View Order →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Responses ── */}
      {quote.responses.length > 0 && (
        <div className="border border-white/8">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/8">
            <DollarSign className="h-3.5 w-3.5 text-white/25" />
            <span className={`${mono.className} text-[10px] uppercase tracking-[0.2em] text-white/40`}>
              Responses Sent ({quote.responses.length})
            </span>
          </div>
          <div>
            {quote.responses.map((res, i) => (
              <div
                key={res.id}
                className={`p-6 ${i < quote.responses.length - 1 ? 'border-b border-white/5' : ''} ${res.isAccepted ? 'bg-emerald-400/[0.03]' : ''}`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className="text-white font-black"
                        style={{ fontFamily: 'var(--font-epilogue)', fontSize: '1.4rem' }}
                      >
                        ${res.price.toFixed(2)}
                      </span>
                      {res.shippingCost != null && (
                        <span className={`${mono.className} text-[10px] uppercase tracking-[0.12em] text-white/30`}>
                          + ${res.shippingCost.toFixed(2)} shipping
                        </span>
                      )}
                      {res.isAccepted && (
                        <span className={`${mono.className} inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] text-emerald-400`}>
                          <CheckCircle2 className="h-3 w-3" /> Accepted
                        </span>
                      )}
                    </div>

                    <div className={`${mono.className} flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.12em] text-white/30`}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {res.estimatedDays} days
                      </span>
                      {res.recommendedMaterial && (
                        <span>{res.recommendedMaterial.type} · {res.recommendedMaterial.color}</span>
                      )}
                      {res.recommendedColor && <span>Color: {res.recommendedColor}</span>}
                    </div>

                    {res.technicalNotes && (
                      <p className={`${mono.className} text-[10px] leading-relaxed text-white/35 italic`}>
                        {res.technicalNotes}
                      </p>
                    )}
                    {res.alternativeOptions && (
                      <p className={`${mono.className} text-[10px] leading-relaxed text-white/35`}>
                        Alt: {res.alternativeOptions}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <p className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-white/20`}>
                      {res.createdBy
                        ? `${res.createdBy.firstName} ${res.createdBy.lastName}`
                        : 'Staff'}
                    </p>
                    <p className={`${mono.className} text-[9px] uppercase tracking-[0.1em] text-white/20`}>
                      {formatDateTime(res.createdAt)}
                    </p>
                    <p className={`${mono.className} text-[9px] uppercase tracking-[0.1em] text-white/20`}>
                      Expires {formatDate(res.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Send response form ── */}
      {canRespond && (
        <div className="border border-amber-400/20 bg-amber-400/[0.03] p-6">
          <SectionLabel>Send Quote Response</SectionLabel>

          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StyledFormField label="Price ($)" error={errors.price?.message}>
                <TextInput
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  {...register('price', { valueAsNumber: true })}
                />
              </StyledFormField>
              <StyledFormField label="Shipping ($)" optional error={errors.shippingCost?.message}>
                <TextInput
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  {...register('shippingCost', { valueAsNumber: true })}
                />
              </StyledFormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StyledFormField label="Estimated Days" error={errors.estimatedDays?.message}>
                <TextInput
                  type="number"
                  min={1}
                  placeholder="5"
                  {...register('estimatedDays', { valueAsNumber: true })}
                />
              </StyledFormField>
              <StyledFormField label="Offer Expires In (days)" error={errors.expiresInDays?.message}>
                <TextInput
                  type="number"
                  min={1}
                  max={90}
                  placeholder="14"
                  {...register('expiresInDays', { valueAsNumber: true })}
                />
              </StyledFormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StyledFormField label="Recommended Material" optional>
                <select
                  {...register('recommendedMaterialId')}
                  className={`${mono.className} w-full h-9 bg-white/[0.03] border border-white/10 px-3 text-[11px] text-white/70 focus:outline-none focus:border-amber-400/40 transition-colors`}
                >
                  <option value="">Same as requested</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.type} · {m.color}{m.finish ? ` · ${m.finish}` : ''}
                    </option>
                  ))}
                </select>
              </StyledFormField>
              <StyledFormField label="Recommended Color" optional>
                <TextInput
                  placeholder="e.g. Black"
                  {...register('recommendedColor')}
                />
              </StyledFormField>
            </div>

            <StyledFormField label="Technical Notes" optional>
              <TextareaInput
                rows={3}
                placeholder="Print considerations, layer height recommendations, material notes..."
                {...register('technicalNotes')}
              />
            </StyledFormField>

            <StyledFormField label="Alternative Options" optional>
              <TextareaInput
                rows={2}
                placeholder="e.g. PETG instead of ABS for better layer adhesion..."
                {...register('alternativeOptions')}
              />
            </StyledFormField>

            <button
              type="submit"
              disabled={mutation.isPending}
              className={`${mono.className} inline-flex items-center gap-2 bg-amber-400 text-black text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-9 hover:bg-amber-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {mutation.isPending ? 'Sending...' : 'Send Quote Response'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}