'use client';

import { mono } from '@/lib/fonts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MATERIAL_TYPES,
  MATERIAL_FINISHES,
  MATERIAL_GRADES,
} from '@/lib/api/materials';
import { useQuery } from '@tanstack/react-query';
import { technologiesApi } from '@/lib/api/technologies';

// ── Schema ─────────────────────────────────────────────────────────────────────

const materialFormSchema = z.object({
  type:                   z.string().min(1, 'Type is required'),
  color:                  z.string().min(1, 'Color is required'),
  finish:                 z.string().optional(),
  grade:                  z.string().optional(),
  description:            z.string().optional(),
  brand:                  z.string().optional(),
  pricePerGram:           z.number().positive('Price must be positive'),
  stockGrams:             z.number().min(0, 'Stock cannot be negative'),
  lowStockThresholdGrams: z.number().min(0).optional(),
  notes:                  z.string().optional(),
  printSettings:          z.string().optional(),
  printingTechnologyId:   z.string().optional(),
  isActive:               z.boolean(),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  optional,
  required,
}: {
  children: React.ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label
      className={`${mono.className} block text-[9px] uppercase tracking-[0.15em] mb-1.5 ${
        required ? 'text-red-500' : 'text-text-muted'
      }`}
    >
      {children}
      {optional && (
        <span className="ml-1.5 text-text-muted normal-case tracking-normal font-normal">
          optional
        </span>
      )}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className={`${mono.className} text-[8px] text-red-400 mt-1 uppercase tracking-[0.1em]`}>
      {msg}
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface MaterialFormProps {
  defaultValues?: Partial<MaterialFormValues>;
  onSubmit: (values: MaterialFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function MaterialForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
}: MaterialFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      isActive: true,
      ...defaultValues,
    },
  });

  const { data: techData } = useQuery({
    queryKey: ['technologies'],
    queryFn: () => technologiesApi.getAll(),
  });

  const inputClass = `${mono.className} w-full h-9 bg-surface-alt border border-border px-3 text-[10px] text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`;
  const selectClass = `${inputClass} appearance-none`;
  const textareaClass = `${mono.className} w-full bg-surface-alt border border-border px-3 py-2 text-[10px] text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Identity ── */}
      <div>
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted mb-3`}>
          Identity
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Type</FieldLabel>
            <select {...register('type')} className={selectClass}>
              <option value="">Select type…</option>
              {MATERIAL_TYPES.map(t => (
                <option key={t} value={t} className="bg-page">{t}</option>
              ))}
            </select>
            <FieldError msg={errors.type?.message} />
          </div>
          <div>
            <FieldLabel required>Color</FieldLabel>
            <input
              type="text"
              placeholder="e.g. Signal White"
              {...register('color')}
              className={inputClass}
            />
            <FieldError msg={errors.color?.message} />
          </div>
          <div>
            <FieldLabel optional>Brand</FieldLabel>
            <input
              type="text"
              placeholder="e.g. Bambu Lab"
              {...register('brand')}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel optional>Printing Technology</FieldLabel>
            <select {...register('printingTechnologyId')} className={selectClass}>
              <option value="">None</option>
              {techData?.data.map(t => (
                <option key={t.id} value={t.id} className="bg-page">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel optional>Finish</FieldLabel>
            <select {...register('finish')} className={selectClass}>
              <option value="">None</option>
              {MATERIAL_FINISHES.map(f => (
                <option key={f} value={f} className="bg-page">{f}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel optional>Grade</FieldLabel>
            <select {...register('grade')} className={selectClass}>
              <option value="">None</option>
              {MATERIAL_GRADES.map(g => (
                <option key={g} value={g} className="bg-page">{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Pricing & Stock ── */}
      <div>
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted mb-3`}>
          Pricing &amp; Stock
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel required>Price per Gram ($)</FieldLabel>
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.0200"
              {...register('pricePerGram', { valueAsNumber: true })}
              className={inputClass}
            />
            <FieldError msg={errors.pricePerGram?.message} />
          </div>
          <div>
            <FieldLabel required>Stock (grams)</FieldLabel>
            <input
              type="number"
              step="1"
              min="0"
              placeholder="1000"
              {...register('stockGrams', { valueAsNumber: true })}
              className={inputClass}
            />
            <FieldError msg={errors.stockGrams?.message} />
          </div>
          <div>
            <FieldLabel optional>Low Stock Threshold (g)</FieldLabel>
            <input
              type="number"
              step="1"
              min="0"
              placeholder="200"
              {...register('lowStockThresholdGrams', {
                setValueAs: v => (v === '' || isNaN(Number(v))) ? undefined : Number(v),
              })}
              className={inputClass}
            />
            <FieldError msg={errors.lowStockThresholdGrams?.message} />
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <div>
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted mb-3`}>
          Details
        </p>
        <div className="space-y-4">
          <div>
            <FieldLabel optional>Description</FieldLabel>
            <textarea
              rows={2}
              placeholder="Short customer-facing description…"
              {...register('description')}
              className={textareaClass}
            />
          </div>
          <div>
            <FieldLabel optional>Print Settings</FieldLabel>
            <textarea
              rows={2}
              placeholder="Recommended nozzle temp, bed temp, speed…"
              {...register('printSettings')}
              className={textareaClass}
            />
          </div>
          <div>
            <FieldLabel optional>Internal Notes</FieldLabel>
            <textarea
              rows={2}
              placeholder="Supplier info, handling notes, etc…"
              {...register('notes')}
              className={textareaClass}
            />
          </div>
        </div>
      </div>

      {/* ── Status ── */}
      <div className="flex items-center gap-3">
        <input
          id="isActive"
          type="checkbox"
          {...register('isActive')}
          className="h-4 w-4 accent-accent"
        />
        <label
          htmlFor="isActive"
          className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-text-secondary cursor-pointer`}
        >
          Active (visible to customers)
        </label>
      </div>

      {/* ── Submit ── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${mono.className} h-9 px-6 bg-accent text-white border border-accent text-[9px] uppercase tracking-[0.15em] hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>

    </form>
  );
}
