'use client';

import { mono } from '@/lib/fonts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  MATERIAL_TYPES, MATERIAL_FINISHES, MATERIAL_GRADES,
} from '@/lib/api/materials';
import { technologiesApi } from '@/lib/api/technologies';
import {
  PrintSettingsEditor,
  parsePrintSettings,
  serialisePrintSettings,
  type PrintSettingPair,
} from './PrintSettingsEditor';


// ─── Schema ───────────────────────────────────────────────────────────────────

const materialSchema = z.object({
  type:                   z.string().min(1, 'Required'),
  color:                  z.string().min(1, 'Required'),
  finish:                 z.string().optional(),
  grade:                  z.string().optional(),
  description:            z.string().optional(),
  brand:                  z.string().optional(),
  pricePerGram:           z.number({ message: 'Required' }).min(0.0001, 'Must be > 0'),
  stockGrams:             z.number({ message: 'Required' }).min(0, 'Cannot be negative'),
  lowStockThresholdGrams: z.number().min(0).optional(),
  notes:                  z.string().optional(),
  printSettings:          z.string().optional(),
  printingTechnologyId:   z.string().optional(),
  isActive:               z.boolean(),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MaterialFormProps {
  defaultValues?: Partial<MaterialFormValues>;
  onSubmit: (values: MaterialFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted mb-4 pt-2`}>
      {children}
    </p>
  );
}

function FormRow({
  label, optional, error, hint, children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted block mb-1.5`}>
        {label}
        {optional && <span className="text-text-muted ml-1.5 normal-case tracking-normal">optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p className={`${mono.className} text-[9px] text-text-muted mt-1`}>{hint}</p>
      )}
      {error && (
        <p className={`${mono.className} text-[9px] text-red-400 mt-1`}>{error}</p>
      )}
    </div>
  );
}

const inputCls = `${mono.className} w-full h-9 field-input`;
const selectCls = `${mono.className} w-full h-9 bg-surface-alt border border-border px-3 text-[11px] text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none`;
const textareaCls = `${mono.className} w-full bg-surface-alt border border-border px-3 py-2.5 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none`;

// ─── Form ─────────────────────────────────────────────────────────────────────

export function MaterialForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: MaterialFormProps) {
  const { data: techData } = useQuery({
    queryKey: ['technologies'],
    queryFn: () => technologiesApi.getAll(),
  });

  const technologies = techData?.data ?? [];

  const [printSettingPairs, setPrintSettingPairs] = useState<PrintSettingPair[]>(
    () => parsePrintSettings(defaultValues?.printSettings ?? null)
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      type:                   defaultValues?.type ?? '',
      color:                  defaultValues?.color ?? '',
      finish:                 defaultValues?.finish ?? '',
      grade:                  defaultValues?.grade ?? '',
      description:            defaultValues?.description ?? '',
      brand:                  defaultValues?.brand ?? '',
      pricePerGram:           defaultValues?.pricePerGram ?? 0.15,
      stockGrams:             defaultValues?.stockGrams ?? 0,
      lowStockThresholdGrams: defaultValues?.lowStockThresholdGrams ?? undefined,
      notes:                  defaultValues?.notes ?? '',
      printSettings:          defaultValues?.printSettings ?? '',
      printingTechnologyId:   defaultValues?.printingTechnologyId ?? '',
      isActive:               defaultValues?.isActive ?? true,
    },
  });

  const isActive = watch('isActive');

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({
      ...values,
      printSettings: serialisePrintSettings(printSettingPairs),
    }))} className="space-y-5">

      {/* ── Identity ── */}
      <SectionLabel>Identity</SectionLabel>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Type" error={errors.type?.message}>
          <select className={selectCls} {...register('type')}>
            <option value="">Select type...</option>
            {MATERIAL_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Color" error={errors.color?.message}>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. Galaxy Black"
            {...register('color')}
          />
        </FormRow>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Finish" optional>
          <select className={selectCls} {...register('finish')}>
            <option value="">None</option>
            {MATERIAL_FINISHES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Grade" optional>
          <select className={selectCls} {...register('grade')}>
            <option value="">None</option>
            {MATERIAL_GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </FormRow>
      </div>

      {/* ── Customer-facing ── */}
      <div className="border-t border-border pt-4">
        <SectionLabel>Customer-facing</SectionLabel>
      </div>

      <FormRow label="Description" optional>
        <textarea
          rows={3}
          className={textareaCls}
          placeholder="Describe the material's properties and best use cases..."
          {...register('description')}
        />
      </FormRow>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Technology" optional>
          <select className={selectCls} {...register('printingTechnologyId')}>
            <option value="">None</option>
            {technologies.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Price per gram ($)" error={errors.pricePerGram?.message}>
          <input
            type="number"
            step="0.0001"
            min={0}
            className={inputCls}
            placeholder="0.0150"
            {...register('pricePerGram', { valueAsNumber: true })}
          />
        </FormRow>
      </div>

      {/* ── Inventory ── */}
      <div className="border-t border-border pt-4">
        <SectionLabel>Inventory</SectionLabel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Stock (grams)" error={errors.stockGrams?.message}>
          <input
            type="number"
            step="1"
            min={0}
            className={inputCls}
            placeholder="1000"
            {...register('stockGrams', { valueAsNumber: true })}
          />
        </FormRow>
        <FormRow
          label="Low stock threshold (grams)"
          optional
          hint="Alert fires when stock drops below this"
        >
          <input
            type="number"
            step="1"
            min={0}
            className={inputCls}
            placeholder="e.g. 500"
            {...register('lowStockThresholdGrams', {
              setValueAs: v => v === '' ? undefined : isNaN(Number(v)) ? undefined : Number(v),
            })}
          />
        </FormRow>
      </div>

      {/* ── Internal ── */}
      <div className="border-t border-border pt-4">
        <SectionLabel>Internal</SectionLabel>
      </div>

      <FormRow label="Brand" optional hint="Not shown to customers">
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. Polymaker"
          {...register('brand')}
        />
      </FormRow>

      <FormRow label="Notes" optional hint="Reorder info, supplier contacts, etc.">
        <textarea
          rows={2}
          className={textareaCls}
          placeholder="Internal notes..."
          {...register('notes')}
        />
      </FormRow>

      <FormRow
        label="Print Settings"
        optional
        hint="Technology-specific slicer config — numeric values are stored as numbers"
      >
        <PrintSettingsEditor
          pairs={printSettingPairs}
          onChange={setPrintSettingPairs}
        />
      </FormRow>

      {/* ── Visibility ── */}
      <div className="border-t border-border pt-5 flex items-center justify-between">
        <div>
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-text-secondary`}>
            Active — visible to customers
          </p>
          <p className={`${mono.className} text-[9px] text-text-muted mt-0.5`}>
            Inactive materials are hidden from the order form
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setValue('isActive', !isActive)}
          className={`relative w-10 h-5 transition-colors shrink-0 ${
            isActive ? 'bg-accent' : 'bg-border'
          }`}
        >
          <span className={`absolute top-0.5 h-4 w-4 bg-white transition-transform ${
            isActive ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* ── Submit ── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${mono.className} inline-flex items-center gap-2 bg-accent-light text-accent-dark text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-9 hover:bg-amber-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>

    </form>
  );
}