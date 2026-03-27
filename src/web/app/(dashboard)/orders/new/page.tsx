'use client';

import { display, mono } from '@/lib/fonts';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { materialsApi } from '@/lib/api/materials';
import { ordersApi } from '@/lib/api/orders';
import { filesApi } from '@/lib/api/files';
import { pricingApi } from '@/lib/api/pricing';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { PriceEstimatePanel } from '@/components/orders/PriceEstimatePanel';


// ── Schema ────────────────────────────────────────────────────────────────────

const orderSchema = z.object({
  materialId:          z.string().min(1, 'Please select a material'),
  quantity:            z.number().int().min(1, 'Quantity must be at least 1'),
  quality:             z.string().min(1, 'Please select a quality'),
  infill:              z.number().min(5).max(100).optional(),
  supportStructures:   z.boolean(),
  specialInstructions: z.string().optional(),
  shippingAddress:     z.string().min(1, 'Shipping address is required'),
  notes:               z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const QUALITY_OPTIONS = [
  { value: 'Draft',    label: 'Draft (0.3 mm)',    sub: 'Fastest'     },
  { value: 'Standard', label: 'Standard (0.2 mm)', sub: 'Recommended' },
  { value: 'High',     label: 'High (0.1 mm)',      sub: 'Best finish' },
];

// ── Shared field primitives ───────────────────────────────────────────────────

const inputCls = `w-full h-9 bg-surface-alt border border-border px-3 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`;
const textareaCls = `w-full bg-surface-alt border border-border px-3 py-2.5 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none`;

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
    <div className="border border-border bg-surface">
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

export default function NewOrderPage() {
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

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-config'],
    queryFn:  () => pricingApi.getConfig(),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes — changes rarely
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<OrderFormValues>({
      resolver: zodResolver(orderSchema),
      defaultValues: {
        quantity:          1,
        quality:           'Standard',
        infill:            20,
        supportStructures: false,
      },
    });

  // Watched values for live estimate
  const selectedMaterialId = watch('materialId');
  const selectedQuality    = watch('quality');
  const selectedQuantity   = watch('quantity');
  const selectedMaterial   = materialsData?.data.find(m => m.id === selectedMaterialId);

  const onSubmit = async (values: OrderFormValues) => {
    if (!fileId) return;
    try {
      const response = await ordersApi.create({
        notes:           values.notes,
        shippingAddress: values.shippingAddress,
        items: [{
          fileId,
          materialId:          values.materialId,
          quantity:            values.quantity,
          color:               selectedMaterial?.color ?? '',
          specialInstructions: values.specialInstructions,
          quality:             values.quality,
          infill:              values.infill,
          supportStructures:   values.supportStructures,
        }],
      });
      router.push(`/orders?created=${response.data.id}`);
    } catch {
      // errors.root set below
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
          Orders / New
        </p>
        <h1 className={`${display.className} text-4xl text-text-primary tracking-wide`}>
          Place an Order
        </h1>
        <p className={`${mono.className} text-[11px] text-text-muted mt-1`}>
          Configure your print settings and submit
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

        {/* Material */}
        <Section title="Material">
          <div>
            <FieldLabel>Material</FieldLabel>
            <div className="relative">
              <select
                {...register('materialId')}
                className={`${inputCls} ${mono.className} appearance-none pr-8`}
              >
                <option value="">Select a material</option>
                {materialsData?.data.map(m => (
                  <option key={m.id} value={m.id} className="bg-page">
                    {m.type} — {m.color}  ·  ${m.pricePerGram.toFixed(3)}/g
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            </div>
            <FieldError msg={errors.materialId?.message} />
          </div>
        </Section>

        {/* Print settings */}
        <Section title="Print Settings">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Quantity</FieldLabel>
              <input
                type="number"
                min={1}
                className={`${inputCls} ${mono.className}`}
                {...register('quantity', { valueAsNumber: true })}
              />
              <FieldError msg={errors.quantity?.message} />
            </div>
            <div>
              <FieldLabel>Infill %</FieldLabel>
              <input
                type="number"
                min={5}
                max={100}
                className={`${inputCls} ${mono.className}`}
                {...register('infill', { valueAsNumber: true })}
              />
              <FieldError msg={errors.infill?.message} />
            </div>
          </div>

          <div>
            <FieldLabel>Quality</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map(q => {
                const active = selectedQuality === q.value;
                return (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setValue('quality', q.value)}
                    className={`border p-3 text-left transition-colors ${active
                      ? 'border-amber-400/40 bg-amber-400/[0.05]'
                      : 'border-border hover:border-border'
                    }`}
                  >
                    <p className={`${mono.className} text-[10px] ${active ? 'text-amber-700' : 'text-text-secondary'}`}>
                      {q.label}
                    </p>
                    <p className={`${mono.className} text-[8px] text-text-muted mt-0.5`}>
                      {q.sub}
                    </p>
                  </button>
                );
              })}
            </div>
            <FieldError msg={errors.quality?.message} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-amber-400"
              {...register('supportStructures')}
            />
            <span className={`${mono.className} text-[10px] text-text-secondary group-hover:text-text-secondary transition-colors`}>
              Include support structures
            </span>
          </label>

          <div>
            <FieldLabel optional>Special Instructions</FieldLabel>
            <textarea
              rows={3}
              placeholder="Any specific requirements for this print..."
              className={`${textareaCls} ${mono.className}`}
              {...register('specialInstructions')}
            />
          </div>
        </Section>

        {/* ── Live price estimate ─────────────────────────────────────────── */}
        <PriceEstimatePanel
          weightGrams={fileData?.data.analysis?.estimatedWeightGrams}
          pricePerGram={selectedMaterial?.pricePerGram}
          quality={selectedQuality}
          quantity={selectedQuantity || 1}
          pricingConfig={pricingData?.data}
        />

        {/* Delivery */}
        <Section title="Delivery">
          <div>
            <FieldLabel>Shipping Address</FieldLabel>
            <textarea
              rows={3}
              placeholder="Enter your full shipping address..."
              className={`${textareaCls} ${mono.className}`}
              {...register('shippingAddress')}
            />
            <FieldError msg={errors.shippingAddress?.message} />
          </div>

          <div>
            <FieldLabel optional>Order Notes</FieldLabel>
            <textarea
              rows={2}
              placeholder="Anything else we should know..."
              className={`${textareaCls} ${mono.className}`}
              {...register('notes')}
            />
          </div>
        </Section>

        {errors.root && (
          <p className={`${mono.className} text-[10px] text-red-400`}>
            {errors.root.message}
          </p>
        )}

        {/* Actions */}
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
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>

      </form>
    </div>
  );
}