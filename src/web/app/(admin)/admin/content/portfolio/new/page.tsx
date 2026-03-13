'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { contentApi, type CreatePortfolioItemRequest } from '@/lib/api/content';
import { JetBrains_Mono } from 'next/font/google';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ProjectDetailsEditor,
  serialiseProjectDetails,
  type ProjectDetailPair,
} from '@/components/admin/ProjectDetailsEditor';
import { MediaUploadField } from '@/components/admin/MediaUploadField';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const PORTFOLIO_CATEGORIES = [
  'Prototyping', 'Automotive', 'Aerospace', 'Medical', 'Architecture',
  'Art', 'Fashion', 'Jewelry', 'Industrial', 'Consumer', 'Educational', 'Other',
];

const schema = z.object({
  title:               z.string().min(1, 'Required'),
  description:         z.string().min(1, 'Required'),
  detailedDescription: z.string().optional(),
  category:            z.string().min(1, 'Required'),
  imageUrl:            z.string().url('Must be a valid URL'),
  modelFileUrl:        z.string().url('Must be a valid URL').optional().or(z.literal('')),
  timelapseVideoUrl:   z.string().optional(),
  tags:                z.string().optional(),
  displayOrder:        z.number({ message: 'Required' }).int().min(0),
  isFeatured:          z.boolean(),
  isPublished:         z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${mono.className} text-[8px] uppercase tracking-[0.22em] text-white/20 pb-2 border-b border-white/6`}>
      {children}
    </p>
  );
}

function FormRow({
  label, hint, optional, error, children,
}: {
  label: string; hint?: string; optional?: boolean;
  error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/40`}>{label}</p>
        {optional && <p className={`${mono.className} text-[8px] text-white/15`}>optional</p>}
      </div>
      {children}
      {hint  && <p className={`${mono.className} text-[8px] text-white/20`}>{hint}</p>}
      {error && <p className={`${mono.className} text-[8px] text-red-400`}>{error}</p>}
    </div>
  );
}

export default function NewPortfolioItemPage() {
  const router = useRouter();
  const [toast,       setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [detailPairs, setDetailPairs] = useState<ProjectDetailPair[]>([]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayOrder: 0, isFeatured: false, isPublished: false },
  });

  const isFeatured  = watch('isFeatured');
  const isPublished = watch('isPublished');

  const inputCls    = `${mono.className} w-full h-9 bg-white/[0.03] border border-white/10 px-3 text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-amber-400/40 transition-colors`;
  const selectCls   = `${mono.className} w-full h-9 bg-white/[0.03] border border-white/10 px-3 text-[11px] text-white/70 focus:outline-none focus:border-amber-400/40 transition-colors appearance-none`;
  const textareaCls = `${mono.className} w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-amber-400/40 transition-colors resize-y`;

  const mutation = useMutation({
    mutationFn: (data: CreatePortfolioItemRequest) => contentApi.createPortfolioItem(data),
    onSuccess: () => {
      showToast('success', 'Portfolio item created.');
      setTimeout(() => router.push('/admin/content'), 800);
    },
    onError: () => showToast('error', 'Failed to create portfolio item.'),
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      title:               values.title,
      description:         values.description,
      detailedDescription: values.detailedDescription || undefined,
      category:            values.category,
      imageUrl:            values.imageUrl,
      modelFileUrl:        values.modelFileUrl || undefined,
      timelapseVideoUrl:   values.timelapseVideoUrl || undefined,
      tags:                values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      projectDetails:      serialiseProjectDetails(detailPairs),
      displayOrder:        values.displayOrder,
      isFeatured:          values.isFeatured,
      isPublished:         values.isPublished,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 border ${
          toast.type === 'success'
            ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
            : 'bg-red-400/10 border-red-400/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>{toast.msg}</p>
        </div>
      )}

      <button
        onClick={() => router.push('/admin/content')}
        className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/25 hover:text-white/50 transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Content
      </button>

      <h1
        className="font-black tracking-tight leading-[1.1] text-white"
        style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
      >
        New Portfolio Item
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        <SectionLabel>Identity</SectionLabel>

        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Title" error={errors.title?.message}>
            <input type="text" className={inputCls} placeholder="e.g. Mechanical Gear Assembly" {...register('title')} />
          </FormRow>
          <FormRow label="Category" error={errors.category?.message}>
            <select className={selectCls} {...register('category')}>
              <option value="">Select category...</option>
              {PORTFOLIO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormRow>
        </div>

        <FormRow label="Short Description" hint="Shown in the gallery grid" error={errors.description?.message}>
          <textarea rows={3} className={textareaCls} placeholder="Brief description..." {...register('description')} />
        </FormRow>

        <FormRow label="Detailed Description" optional hint="Shown on the item detail page">
          <textarea rows={5} className={textareaCls} placeholder="Full description..." {...register('detailedDescription')} />
        </FormRow>

        <FormRow label="Tags" optional hint="Comma-separated">
          <input type="text" className={inputCls} placeholder="e.g. functional, prototype, PLA" {...register('tags')} />
        </FormRow>

        <SectionLabel>Media</SectionLabel>

        <FormRow label="Image" error={errors.imageUrl?.message}>
          <MediaUploadField
            label="Main Image"
            value={watch('imageUrl') ?? ''}
            onChange={url => setValue('imageUrl', url)}
            mode="image"
            error={errors.imageUrl?.message}
          />
        </FormRow>

        <FormRow label="Model File" optional hint="STL / OBJ — enables 3D viewer on the detail page" error={errors.modelFileUrl?.message}>
          <MediaUploadField
            label="Model File"
            value={watch('modelFileUrl') ?? ''}
            onChange={url => setValue('modelFileUrl', url)}
            mode="model"
            optional
            error={errors.modelFileUrl?.message}
          />
        </FormRow>

        <FormRow label="Timelapse Video" optional hint="MP4 — shown as a video preview">
          <MediaUploadField
            label="Timelapse Video"
            value={watch('timelapseVideoUrl') ?? ''}
            onChange={url => setValue('timelapseVideoUrl', url)}
            mode="video"
            optional
          />
        </FormRow>

        <SectionLabel>Project Details</SectionLabel>

        <FormRow label="Key / Value Pairs" optional hint="e.g. Print Time, Layer Height, Infill">
          <ProjectDetailsEditor pairs={detailPairs} onChange={setDetailPairs} />
        </FormRow>

        <SectionLabel>Display</SectionLabel>

        <FormRow label="Display Order" hint="Lower numbers appear first" error={errors.displayOrder?.message}>
          <input type="number" className={`${inputCls} w-32`} {...register('displayOrder', { valueAsNumber: true })} />
        </FormRow>

        {[
          { field: 'isFeatured'  as const, val: isFeatured,  label: 'Featured',  desc: 'Show on homepage featured section' },
          { field: 'isPublished' as const, val: isPublished, label: 'Published', desc: 'Visible on the public portfolio page' },
        ].map(({ field, val, label, desc }) => (
          <div key={field} className="flex items-center justify-between border-t border-white/6 pt-4">
            <div>
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-white/50`}>{label}</p>
              <p className={`${mono.className} text-[9px] text-white/20 mt-0.5`}>{desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={val}
              onClick={() => setValue(field, !val)}
              className={`relative w-10 h-5 transition-colors shrink-0 ${val ? 'bg-amber-400' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 bg-white transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className={`${mono.className} bg-amber-400 text-black text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-9 hover:bg-amber-300 transition-colors disabled:opacity-40`}
          >
            {mutation.isPending ? 'Creating...' : 'Create Item'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/content')}
            className={`${mono.className} text-[10px] uppercase tracking-[0.18em] px-6 h-9 border border-white/10 text-white/30 hover:text-white/50 hover:border-white/20 transition-colors`}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}