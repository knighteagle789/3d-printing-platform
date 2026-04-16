'use client';

import { display, mono } from '@/lib/fonts';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { materialsApi } from '@/lib/api/materials';
import { quotesApi } from '@/lib/api/quotes';
import { filesApi } from '@/lib/api/files';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ArrowLeft, ChevronDown } from 'lucide-react';


// ── Schema ────────────────────────────────────────────────────────────────────

const quoteSchema = z.object({
  quantity:            z.number().int().min(1, 'Quantity must be at least 1'),
  preferredMaterialId: z.string().optional(),
  requiredByDate:      z.string().optional(),
  specialRequirements: z.string().optional(),
  notes:               z.string().optional(),
  budgetMin:           z.number().min(0).optional(),
  budgetMax:           z.number().min(0).optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

// ── Shared primitives ─────────────────────────────────────────────────────────


function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className={`${mono.className} block text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1.5`}>
      {children}
      {optional && <span className="ml-1.5 text-text-muted normal-case tracking-normal">optional</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={`${mono.className} text-[8px] text-red-400 mt-1`}>{msg}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface" >
      <div className="px-4 py-2.5 border-b border-border">
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
          {title}
        </span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewQuotePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fileId       = searchParams.get('fileId');
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const { data: fileData } = useQuery({
    queryKey: ['file', fileId],
    queryFn:  () => filesApi.getById(fileId!),
    enabled:  !!fileId && isAuthenticated,
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn:  () => materialsApi.getAll(),
    enabled:  isAuthenticated,
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<QuoteFormValues>({
      resolver: zodResolver(quoteSchema),
      defaultValues: { quantity: 1 },
    });

  const onSubmit = async (values: QuoteFormValues) => {
    if (!fileId) return;

    // Normalize optional string fields: empty strings from form inputs must be
    // sent as undefined so they omit cleanly from the JSON payload — the
    // backend expects Guid?/DateTime?/string? and rejects empty strings.
    const materialId     = values.preferredMaterialId?.trim() || undefined;
    const requiredByDate = values.requiredByDate?.trim() || undefined;
    const specialReqs    = values.specialRequirements?.trim() || undefined;
    const notes          = values.notes?.trim() || undefined;

    try {
      const response = await quotesApi.create({
        files: [{
          fileId,
          materialId,
          quantity: values.quantity,
        }],
        requiredByDate,
        specialRequirements: specialReqs,
        notes,
        budgetMin: values.budgetMin,
        budgetMax: values.budgetMax,
      });
      router.push(`/quotes?created=${response.data.id}`);
    } catch {
      // root error handled below
    }
  };

  if (!isInitialized || !isAuthenticated) return null;

  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors mb-4`}
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-700 mb-2`}>
          Quotes / New
        </p>
        <h1 className={`${display.className} text-4xl text-text-primary tracking-wide`}>
          Request a Quote
        </h1>
        <p className={`${mono.className} text-[11px] text-text-muted mt-1`}>
          Tell us about your project and we&apos;ll get back to you with pricing
        </p>
      </div>

      {/* File summary */}
      {fileData && (
        <div className="mb-4 border border-amber-400/10 bg-amber-400/[0.02] px-4 py-3 flex items-center justify-between">
          <span className={`${mono.className} text-[10px] text-text-muted`}>File</span>
          <span className={`${mono.className} text-[11px] text-text-secondary`}>
            {fileData.data.originalFileName}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Preferences */}
        <Section title="Print Preferences">
          <div>
            <FieldLabel>Quantity</FieldLabel>
            <input
              type="number"
              min={1}
              className={`field-input-alt ${mono.className}`}
              {...register('quantity', { valueAsNumber: true })}
            />
            <FieldError msg={errors.quantity?.message} />
          </div>

          <div>
            <FieldLabel optional>Preferred Material</FieldLabel>
            <div className="relative">
              <select
                {...register('preferredMaterialId')}
                className={`field-input-alt ${mono.className} appearance-none pr-8`}
              >
                <option value="">No preference</option>
                {materialsData?.data.map(m => (
                  <option key={m.id} value={m.id} className="bg-page">
                    {m.type} — {m.color}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            </div>
          </div>

          <div>
            <FieldLabel optional>Required By</FieldLabel>
            <input
              type="date"
              className={`field-input-alt ${mono.className}`}
              {...register('requiredByDate')}
            />
          </div>
        </Section>

        {/* Budget */}
        <Section title="Budget (optional)">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel optional>Minimum ($)</FieldLabel>
              <input
                type="number"
                min={0}
                placeholder="0.00"
                className={`field-input-alt ${mono.className}`}
                {...register('budgetMin', { valueAsNumber: true })}
              />
            </div>
            <div>
              <FieldLabel optional>Maximum ($)</FieldLabel>
              <input
                type="number"
                min={0}
                placeholder="0.00"
                className={`field-input-alt ${mono.className}`}
                {...register('budgetMax', { valueAsNumber: true })}
              />
            </div>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Additional Information">
          <div>
            <FieldLabel optional>Special Requirements</FieldLabel>
            <textarea
              rows={3}
              placeholder="Any specific technical requirements..."
              className={`field-textarea-alt ${mono.className}`}
              {...register('specialRequirements')}
            />
          </div>
          <div>
            <FieldLabel optional>Notes</FieldLabel>
            <textarea
              rows={2}
              placeholder="Anything else you'd like us to know..."
              className={`field-textarea-alt ${mono.className}`}
              {...register('notes')}
            />
          </div>
        </Section>

        {errors.root && (
          <p className={`${mono.className} text-[10px] text-red-400`}>
            {(errors.root as { message?: string }).message}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className={`${mono.className} flex-1 h-10 border border-border text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary hover:border-border transition-colors`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${mono.className} flex-1 h-10 bg-amber-500 border border-amber-400/30 text-[9px] uppercase tracking-[0.15em] text-amber-700 hover:bg-amber-500 hover:text-accent transition-colors disabled:opacity-40`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
          </button>
        </div>

      </form>
    </div>
  );
}
