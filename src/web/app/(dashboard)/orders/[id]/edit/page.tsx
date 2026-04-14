'use client';

import { display, mono } from '@/lib/fonts';
import { use, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ordersApi } from '@/lib/api/orders';
import { materialsApi } from '@/lib/api/materials';
import { pricingApi } from '@/lib/api/pricing';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { ArrowLeft, ChevronDown, Package } from 'lucide-react';
import { PriceEstimatePanel } from '@/components/orders/PriceEstimatePanel';


// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  fileId:              z.string().min(1),
  fileName:            z.string(),          // display-only, not sent to API
  materialId:          z.string().min(1, 'Please select a material'),
  quantity:            z.number().int().min(1, 'Quantity must be at least 1'),
  quality:             z.string().min(1, 'Please select a quality'),
  infill:              z.number().min(5).max(100).optional(),
  supportStructures:   z.boolean(),
  specialInstructions: z.string().optional(),
});

const editOrderSchema = z.object({
  items:           z.array(itemSchema).min(1),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  notes:           z.string().optional(),
});

type EditOrderFormValues = z.infer<typeof editOrderSchema>;

const QUALITY_OPTIONS = [
  { value: 'Draft',    label: 'Draft (0.3 mm)',    sub: 'Fastest'     },
  { value: 'Standard', label: 'Standard (0.2 mm)', sub: 'Recommended' },
  { value: 'High',     label: 'High (0.1 mm)',      sub: 'Best finish' },
];


// ── Shared field primitives ───────────────────────────────────────────────────

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

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const { data: orderData, isLoading: orderLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersApi.getById(id),
    enabled:  isAuthenticated,
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn:  () => materialsApi.getAll(),
    enabled:  isAuthenticated,
  });

  const { data: pricingData } = useQuery({
    queryKey: ['pricing-config'],
    queryFn:  () => pricingApi.getConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors, isSubmitting } } =
    useForm<EditOrderFormValues>({
      resolver: zodResolver(editOrderSchema),
      defaultValues: {
        items: [],
        shippingAddress: '',
        notes: '',
      },
    });

  const { fields } = useFieldArray({ control, name: 'items' });

  // Populate form once the order loads
  useEffect(() => {
    const order = orderData?.data;
    if (!order) return;

    reset({
      items: order.items.map(item => ({
        fileId:              item.file?.id ?? '',
        fileName:            item.file?.originalFileName ?? 'Unknown file',
        materialId:          item.material?.id ?? '',
        quantity:            item.quantity,
        quality:             item.quality,
        infill:              item.infill ?? 20,
        supportStructures:   item.supportStructures,
        specialInstructions: item.specialInstructions ?? '',
      })),
      shippingAddress: order.shippingAddress ?? '',
      notes:           order.notes ?? '',
    });
  }, [orderData, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: EditOrderFormValues) =>
      ordersApi.update(id, {
        notes:           values.notes,
        shippingAddress: values.shippingAddress,
        items: values.items.map(item => ({
          fileId:              item.fileId,
          materialId:          item.materialId,
          quantity:            item.quantity,
          color:               materialsData?.data.find(m => m.id === item.materialId)?.color ?? '',
          specialInstructions: item.specialInstructions,
          quality:             item.quality,
          infill:              item.infill,
          supportStructures:   item.supportStructures,
        })),
      }),
    onSuccess: () => {
      // Invalidate so the detail page reflects the updated data immediately
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      router.push(`/orders/${id}`);
    },
  });

  const onSubmit = (values: EditOrderFormValues) => updateMutation.mutate(values);

  if (!isInitialized || !isAuthenticated) return null;

  if (orderLoading) {
    return (
      <div className="p-8 max-w-2xl space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !orderData) {
    return (
      <div className="p-8">
        <p className={`${mono.className} text-[10px] text-red-400`}>Order not found.</p>
        <button
          onClick={() => router.push('/orders')}
          className={`${mono.className} mt-4 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors`}
        >
          ← Back to orders
        </button>
      </div>
    );
  }

  // Guard: only Draft orders are editable
  if (orderData.data.status !== 'Draft') {
    router.replace(`/orders/${id}`);
    return null;
  }

  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/orders/${id}`)}
          className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors mb-4`}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Order
        </button>
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-700 mb-2`}>
          Orders / {orderData.data.orderNumber} / Edit
        </p>
        <h1 className={`${display.className} text-4xl text-text-primary tracking-wide`}>
          Edit Order
        </h1>
        <p className={`${mono.className} text-[11px] text-text-muted mt-1`}>
          Changes are saved when you click Update Order
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* One section per item */}
        {fields.map((field, index) => {
          const selectedMaterialId = watch(`items.${index}.materialId`);
          const selectedQuality    = watch(`items.${index}.quality`);
          const selectedQuantity   = watch(`items.${index}.quantity`);
          const selectedMaterial   = materialsData?.data.find(m => m.id === selectedMaterialId);
          const originalItem       = orderData.data.items[index];

          return (
            <div key={field.id} className="space-y-4">

              {/* File label */}
              <div className="border border-amber-400/10 bg-amber-400/[0.02] px-4 py-3 flex items-center justify-between">
                <span className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-text-muted`}>
                  <Package className="h-3 w-3" />
                  {fields.length > 1 ? `Item ${index + 1}` : 'File'}
                </span>
                <span className={`${mono.className} text-[11px] text-text-secondary`}>
                  {field.fileName}
                </span>
              </div>

              {/* Hidden fields */}
              <input type="hidden" {...register(`items.${index}.fileId`)} />
              <input type="hidden" {...register(`items.${index}.fileName`)} />

              {/* Material */}
              <Section title="Material">
                <div>
                  <FieldLabel>Material</FieldLabel>
                  <div className="relative">
                    <select
                      {...register(`items.${index}.materialId`)}
                      className={`field-input-alt ${mono.className} appearance-none pr-8`}
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
                  <FieldError msg={errors.items?.[index]?.materialId?.message} />
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
                      className={`field-input-alt ${mono.className}`}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <FieldError msg={errors.items?.[index]?.quantity?.message} />
                  </div>
                  <div>
                    <FieldLabel>Infill %</FieldLabel>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      className={`field-input-alt ${mono.className}`}
                      {...register(`items.${index}.infill`, { valueAsNumber: true })}
                    />
                    <FieldError msg={errors.items?.[index]?.infill?.message} />
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
                          onClick={() => setValue(`items.${index}.quality`, q.value)}
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
                  <FieldError msg={errors.items?.[index]?.quality?.message} />
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-amber-400"
                    {...register(`items.${index}.supportStructures`)}
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
                    className={`field-textarea-alt ${mono.className}`}
                    {...register(`items.${index}.specialInstructions`)}
                  />
                </div>
              </Section>

              {/* Live price estimate */}
              <PriceEstimatePanel
                weightGrams={originalItem?.estimatedWeight ?? undefined}
                pricePerGram={selectedMaterial?.pricePerGram}
                estimatedPrintTimeHours={originalItem?.estimatedPrintTime ?? undefined}
                quality={selectedQuality}
                quantity={selectedQuantity || 1}
                pricingConfig={pricingData?.data}
              />

            </div>
          );
        })}

        {/* Delivery */}
        <Section title="Delivery">
          <div>
            <FieldLabel>Shipping Address</FieldLabel>
            <textarea
              rows={3}
              placeholder="Enter your full shipping address..."
              className={`field-textarea-alt ${mono.className}`}
              {...register('shippingAddress')}
            />
            <FieldError msg={errors.shippingAddress?.message} />
          </div>

          <div>
            <FieldLabel optional>Order Notes</FieldLabel>
            <textarea
              rows={2}
              placeholder="Anything else we should know..."
              className={`field-textarea-alt ${mono.className}`}
              {...register('notes')}
            />
          </div>
        </Section>

        {updateMutation.isError && (
          <p className={`${mono.className} text-[10px] text-red-400`}>
            Failed to save changes — please try again.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push(`/orders/${id}`)}
            className={`${mono.className} flex-1 h-10 border border-border text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary hover:border-border transition-colors`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className={`${mono.className} flex-1 h-10 bg-amber-500 border border-amber-400/30 text-[9px] uppercase tracking-[0.15em] text-amber-700 hover:bg-amber-500 hover:text-accent transition-colors disabled:opacity-40`}
          >
            {updateMutation.isPending ? 'Saving...' : 'Update Order'}
          </button>
        </div>

      </form>
    </div>
  );
}