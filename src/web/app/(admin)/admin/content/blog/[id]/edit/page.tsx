'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { contentApi, type UpdateBlogPostRequest } from '@/lib/api/content';
import { JetBrains_Mono } from 'next/font/google';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { MediaUploadField } from '@/components/admin/MediaUploadField';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const BLOG_CATEGORIES = [
  'News', 'Tutorial', 'CaseStudy', 'Technology',
  'Materials', 'Industry', 'Tips', 'Announcement',
];

const schema = z.object({
  title:            z.string().min(1, 'Required'),
  summary:          z.string().min(1, 'Required'),
  content:          z.string().min(1, 'Required'),
  category:         z.string().min(1, 'Required'),
  featuredImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  tags:             z.string().optional(),
  isPublished:      z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }   = use(params);
  const router   = useRouter();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['blog-post-id', id],
    queryFn:  () => contentApi.getBlogPostById(id),
  });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isPublished: false },
  });

  useEffect(() => {
    if (data?.data) {
      const post = data.data as {
        title: string; summary: string; content: string;
        featuredImageUrl?: string; category: string;
        tags?: string[]; isPublished: boolean; publishedAt?: string;
      };
      reset({
        title:            post.title,
        summary:          post.summary,
        content:          post.content,
        featuredImageUrl: post.featuredImageUrl ?? '',
        category:         post.category,
        tags:             post.tags?.join(', ') ?? '',
        isPublished:      post.isPublished,
      });
    }
  }, [data, reset]);

  const isPublished = watch('isPublished');

  const inputCls    = `${mono.className} w-full h-9 bg-white/[0.03] border border-white/10 px-3 text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-amber-400/40 transition-colors`;
  const selectCls   = `${mono.className} w-full h-9 bg-white/[0.03] border border-white/10 px-3 text-[11px] text-white/70 focus:outline-none focus:border-amber-400/40 transition-colors appearance-none`;
  const textareaCls = `${mono.className} w-full bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-amber-400/40 transition-colors resize-y`;

  const mutation = useMutation({
    mutationFn: (payload: UpdateBlogPostRequest) => contentApi.updateBlogPost(id, payload),
    onSuccess: () => {
      showToast('success', 'Blog post saved.');
      setTimeout(() => router.push('/admin/content'), 800);
    },
    onError: () => showToast('error', 'Failed to save blog post.'),
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      title:            values.title,
      summary:          values.summary,
      content:          values.content,
      category:         values.category,
      featuredImageUrl: values.featuredImageUrl || undefined,
      tags:             values.tags
        ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
      isPublished:      values.isPublished,
      publishedAt:      values.isPublished ? new Date().toISOString() : undefined,
    });
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-4 w-16 bg-white/[0.04] animate-pulse" />
        <div className="h-8 w-48 bg-white/[0.04] animate-pulse" />
        <div className="h-9 bg-white/[0.02] animate-pulse" />
        <div className="h-9 bg-white/[0.02] animate-pulse" />
        <div className="h-64 bg-white/[0.02] animate-pulse" />
        <div className="h-96 bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  const post = data?.data as {
    isPublished: boolean; publishedAt?: string; viewCount?: number;
  } | undefined;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 border ${
          toast.type === 'success'
            ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
            : 'bg-red-400/10 border-red-400/20 text-red-400'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle  className="h-3.5 w-3.5 shrink-0" />}
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>{toast.msg}</p>
        </div>
      )}

      {/* ── Back ── */}
      <button
        onClick={() => router.push('/admin/content')}
        className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/25 hover:text-white/50 transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Content
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <h1
          className="font-black tracking-tight leading-[1.1] text-white"
          style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
        >
          Edit Blog Post
        </h1>
        {post && (
          <span className={`${mono.className} inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.15em] px-3 py-1.5 border shrink-0 ${
            post.isPublished
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
              : 'bg-white/[0.04] text-white/20 border-white/8'
          }`}>
            {post.isPublished ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
            {post.isPublished ? 'Published' : 'Draft'}
          </span>
        )}
      </div>

      {/* ── Stats strip ── */}
      {post && (
        <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
          {[
            { label: 'Views',       value: post.viewCount ?? 0 },
            { label: 'Published',   value: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0d0a06] px-4 py-3">
              <p className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-white/20 mb-1`}>{label}</p>
              <p className={`${mono.className} text-[13px] font-semibold text-white/60`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Identity ── */}
        <SectionLabel>Identity</SectionLabel>

        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Title" error={errors.title?.message}>
            <input type="text" className={inputCls} {...register('title')} />
          </FormRow>
          <FormRow label="Category" error={errors.category?.message}>
            <select
              key={watch('category')}
              className={selectCls}
              {...register('category')}
            >
              <option value="">Select category...</option>
              {BLOG_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormRow>
        </div>

        <FormRow label="Summary" hint="Shown in blog listings and search results" error={errors.summary?.message}>
          <textarea rows={3} className={textareaCls} {...register('summary')} />
        </FormRow>

        <FormRow label="Tags" optional hint="Comma-separated">
          <input type="text" className={inputCls} placeholder="e.g. tutorial, PLA, beginner" {...register('tags')} />
        </FormRow>

        {/* ── Content ── */}
        <SectionLabel>Content</SectionLabel>

        <FormRow label="Body" hint="Markdown supported" error={errors.content?.message}>
          <textarea
            rows={24}
            className={`${textareaCls} font-mono leading-relaxed`}
            {...register('content')}
          />
        </FormRow>

        {/* ── Media ── */}
        <SectionLabel>Media</SectionLabel>

        <FormRow label="Featured Image" optional error={errors.featuredImageUrl?.message}>
          <MediaUploadField
            label="Featured Image"
            value={watch('featuredImageUrl') ?? ''}
            onChange={url => setValue('featuredImageUrl', url)}
            mode="image"
            optional
            error={errors.featuredImageUrl?.message}
          />
        </FormRow>

        {/* ── Visibility ── */}
        <div className="border-t border-white/6 pt-5 flex items-center justify-between">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-white/50`}>
              Published — visible on the public blog
            </p>
            <p className={`${mono.className} text-[9px] text-white/20 mt-0.5`}>
              Toggling off will unpublish the post
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublished}
            onClick={() => setValue('isPublished', !isPublished, { shouldDirty: true })}
            className={`relative w-10 h-5 transition-colors shrink-0 ${
              isPublished ? 'bg-amber-400' : 'bg-white/10'
            }`}
          >
            <span className={`absolute top-0.5 h-4 w-4 bg-white transition-transform ${
              isPublished ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className={`${mono.className} bg-amber-400 text-black text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-9 hover:bg-amber-300 transition-colors disabled:opacity-40`}
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
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