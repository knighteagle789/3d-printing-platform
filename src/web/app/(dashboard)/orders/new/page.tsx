'use client';

import { display, mono } from '@/lib/fonts';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { FileDropzone } from '../../upload/file-dropzone';
import { FileAnalysisPanel } from '../../upload/file-analysis';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import { toProxiedUrl } from '@/lib/utils';


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
  const urlFileId    = searchParams.get('fileId');
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const [localFileId, setLocalFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const effectiveFileId = urlFileId || localFileId;

  const { data: fileData } = useQuery({
    queryKey: ['file', effectiveFileId],
    queryFn:  () => filesApi.getById(effectiveFileId!),
    enabled:  !!effectiveFileId && isAuthenticated,
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

  const selectedMaterialId = watch('materialId');
  const selectedQuality    = watch('quality');
  const selectedQuantity   = watch('quantity');
  const selectedMaterial   = materialsData?.data.find(m => m.id === selectedMaterialId);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (file.name.toLowerCase().endsWith('.stl')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    try {
      const uploaded = await filesApi.uploadChunked(file, setUploadProgress);
      setLocalFileId(uploaded.id);
    } catch {
      setUploadError('Upload failed - please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (!effectiveFileId) return;
    try {
      const response = await ordersApi.create({
        notes:           values.notes,
        shippingAddress: values.shippingAddress,
        items: [{
          fileId:              effectiveFileId,
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
      // errors handled by form state
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
          {effectiveFileId ? 'Configure your print settings and submit' : 'Start by uploading your 3D model file'}
        </p>
      </div>

      {!effectiveFileId && (
        <div className="space-y-4 mb-2">
          <Section title="Step 1 - Upload Your 3D Model">
            <FileDropzone
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
            {uploadError && (
              <p className={`${mono.className} text-[10px] text-red-400`}>{uploadError}</p>
            )}
            <div className="pt-2 border-t border-border">
              <p className={`${mono.className} text-[9px] text-text-muted mb-2`}>
                Upload a model to unlock Step 2 and submit your order.
              </p>
              <button
                type="button"
                disabled
                className={`${mono.className} w-full h-10 bg-amber-500 border border-amber-400/30 text-[9px] uppercase tracking-[0.15em] text-amber-700 opacity-40 cursor-not-allowed`}
              >
                Place Order
              </button>
            </div>
          </Section>

          {previewUrl && (
            <div className="border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
                  3D Preview
                </span>
                {isUploading && (
                  <span className={`${mono.className} text-[9px] text-amber-700 animate-pulse`}>
                    Uploading...
                  </span>
                )}
              </div>
              <StlViewer
                url={toProxiedUrl(previewUrl)}
                className="w-full h-[360px]"
              />
            </div>
          )}
        </div>
      )}

      {effectiveFileId && fileData && (
        <div className="mb-4">
          <FileAnalysisPanel file={fileData.data} />
        </div>
      )}

      {effectiveFileId && (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Material */}
        <Section title="Material">
          <div>
            <FieldLabel>Material</FieldLabel>
            <div className="relative">
              <select
                {...register('materialId')}
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
                className={`field-input-alt ${mono.className}`}
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
                className={`field-input-alt ${mono.className}`}
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
              className={`field-textarea-alt ${mono.className}`}
              {...register('specialInstructions')}
            />
          </div>
        </Section>

        {/* ── Live price estimate ─────────────────────────────────────────── */}
        <PriceEstimatePanel
          weightGrams={fileData?.data.analysis?.estimatedWeightGrams}
          pricePerGram={selectedMaterial?.pricePerGram}
          estimatedPrintTimeHours={fileData?.data.analysis?.estimatedPrintTimeHours}
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
      )}
    </div>
  );
}