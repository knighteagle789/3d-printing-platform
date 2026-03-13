'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { contentApi } from '@/lib/api/content';
import { JetBrains_Mono } from 'next/font/google';
import {
  Plus, Trash2, Eye, EyeOff, Star,
  Image as ImageIcon, FileText, CheckCircle2, AlertCircle, AlertTriangle,
} from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

type Tab = 'portfolio' | 'blog';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  isPublished: boolean;
  publishedAt: string | null;
  viewCount: number;
  author: { firstName: string; lastName: string } | null;
}

interface PagedResponse<T> { items: T[]; totalCount: number; totalPages: number; }

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminContentPage() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [tab, setTab] = useState<Tab>('portfolio');

  const [toast,         setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<{ id: string; type: Tab; title: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Queries ──
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ['admin-portfolio'],
    queryFn:  () => contentApi.getPortfolio(1, 50),
  });

  const { data: blogData, isLoading: blogLoading } = useQuery({
    queryKey: ['admin-blog'],
    queryFn:  () => contentApi.getAllBlogPosts(1, 50),
  });

  const portfolioItems: PortfolioItem[] =
    (portfolioData?.data as PagedResponse<PortfolioItem> | undefined)?.items ?? [];
  const blogPosts: BlogPost[] =
    (blogData?.data as PagedResponse<BlogPost> | undefined)?.items ?? [];

  // ── Mutations ──
  const deletePortfolio = useMutation({
    mutationFn: (id: string) => contentApi.deletePortfolioItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] });
      setDeleteTarget(null);
      showToast('success', 'Portfolio item deleted.');
    },
    onError: () => showToast('error', 'Failed to delete item.'),
  });

  const deleteBlog = useMutation({
    mutationFn: (id: string) => contentApi.deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
      setDeleteTarget(null);
      showToast('success', 'Blog post deleted.');
    },
    onError: () => showToast('error', 'Failed to delete post.'),
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTarget.type === 'portfolio'
      ? deletePortfolio.mutate(deleteTarget.id)
      : deleteBlog.mutate(deleteTarget.id);
  };

  const isDeleting = deletePortfolio.isPending || deleteBlog.isPending;

  // ── Shared styles ──
  const colHdr = `${mono.className} text-[8px] uppercase tracking-[0.2em] text-text-muted`;

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 border ${
          toast.type === 'success'
            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
            : 'bg-red-500 border-red-200 text-red-400'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle  className="h-3.5 w-3.5 shrink-0" />}
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>{toast.msg}</p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="page-title mb-1.5"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Content
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
            {portfolioItems.length} portfolio items · {blogPosts.length} blog posts
          </p>
        </div>
        <button
          onClick={() => router.push(
            tab === 'portfolio' ? '/admin/content/portfolio/new' : '/admin/content/blog/new'
          )}
          className={`${mono.className} inline-flex items-center gap-2 bg-accent-light text-accent-dark text-[10px] uppercase tracking-[0.18em] font-semibold px-5 h-9 hover:bg-amber-300 transition-colors shrink-0`}
        >
          <Plus className="h-3.5 w-3.5" />
          {tab === 'portfolio' ? 'New Portfolio Item' : 'New Blog Post'}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-end gap-0 border-b border-border">
        {([
          { key: 'portfolio' as Tab, label: 'Portfolio', count: portfolioItems.length, icon: ImageIcon },
          { key: 'blog'      as Tab, label: 'Blog',      count: blogPosts.length,      icon: FileText  },
        ]).map(({ key, label, count, icon: Icon }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`${mono.className} relative flex items-center gap-1.5 px-5 py-3 text-[9px] uppercase tracking-[0.18em] transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-accent border-accent'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
              <span className={`text-[8px] px-1 py-0.5 ${
                isActive ? 'badge-admin' : 'bg-surface-alt text-text-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Portfolio tab ── */}
      {tab === 'portfolio' && (
        portfolioLoading ? (
          <div className="space-y-px">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-11 bg-surface-alt animate-pulse" />
            ))}
          </div>
        ) : portfolioItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ImageIcon className="h-8 w-8 text-text-muted" />
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-text-muted`}>
              No portfolio items yet
            </p>
            <button
              onClick={() => router.push('/admin/content/portfolio/new')}
              className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-amber-700 hover:text-accent transition-colors`}
            >
              Add your first item →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-surface-alt">
            {/* Header */}
            <div
              className="grid bg-[var(--page-bg)] px-4 py-2"
              style={{ gridTemplateColumns: '2.5fr 1fr 0.5fr 1fr 1fr 5rem' }}
            >
              {['Title', 'Category', 'Order', 'Featured', 'Status', ''].map(h => (
                <p key={h} className={colHdr}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            {portfolioItems.map(item => (
              <div
                key={item.id}
                onClick={() => router.push(`/admin/content/portfolio/${item.id}/edit`)}
                className="grid items-center bg-[var(--page-bg)] px-4 py-3 cursor-pointer hover:bg-surface-alt transition-colors group"
                style={{ gridTemplateColumns: '2.5fr 1fr 0.5fr 1fr 1fr 5rem' }}
              >
                <p className={`${mono.className} text-[11px] text-text-primary group-hover:text-text-primary transition-colors`}>{item.title}</p>

                <span className={`${mono.className} text-[8px] uppercase tracking-[0.12em] px-2 py-1 bg-surface-alt text-text-muted w-fit`}>
                  {item.category}
                </span>

                <p className={`${mono.className} text-[10px] text-text-muted`}>{item.displayOrder}</p>

                <span>
                  {item.isFeatured
                    ? <span className={`${mono.className} inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] text-accent`}><Star className="h-2.5 w-2.5" /> Featured</span>
                    : <span className={`${mono.className} text-[10px] text-text-muted`}>—</span>
                  }
                </span>

                <span className={`${mono.className} inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] w-fit px-2 py-1 ${
                  item.isPublished
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-surface-alt text-text-muted'
                }`}>
                  {item.isPublished ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                  {item.isPublished ? 'Published' : 'Draft'}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: item.id, type: 'portfolio', title: item.title }); }}
                    className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Blog tab ── */}
      {tab === 'blog' && (
        blogLoading ? (
          <div className="space-y-px">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-11 bg-surface-alt animate-pulse" />
            ))}
          </div>
        ) : blogPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText className="h-8 w-8 text-text-muted" />
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-text-muted`}>
              No blog posts yet
            </p>
            <button
              onClick={() => router.push('/admin/content/blog/new')}
              className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-amber-700 hover:text-accent transition-colors`}
            >
              Write your first post →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-surface-alt">
            {/* Header */}
            <div
              className="grid bg-[var(--page-bg)] px-4 py-2"
              style={{ gridTemplateColumns: '3fr 1fr 1.5fr 0.5fr 1fr 5rem' }}
            >
              {['Title', 'Category', 'Author', 'Views', 'Status', ''].map(h => (
                <p key={h} className={colHdr}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            {blogPosts.map(post => (
              <div
                key={post.id}
                onClick={() => router.push(`/admin/content/blog/${post.id}/edit`)}
                className="grid items-center bg-[var(--page-bg)] px-4 py-3 cursor-pointer hover:bg-surface-alt transition-colors group"
                style={{ gridTemplateColumns: '3fr 1fr 1.5fr 0.5fr 1fr 5rem' }}
              >
                <p className={`${mono.className} text-[11px] text-text-primary truncate pr-4 group-hover:text-text-primary transition-colors`}>{post.title}</p>

                <span className={`${mono.className} text-[8px] uppercase tracking-[0.12em] px-2 py-1 bg-surface-alt text-text-muted w-fit`}>
                  {post.category}
                </span>

                <p className={`${mono.className} text-[10px] text-text-muted`}>
                  {post.author ? `${post.author.firstName} ${post.author.lastName}` : '—'}
                </p>

                <p className={`${mono.className} text-[10px] text-text-muted`}>{post.viewCount}</p>

                <span className={`${mono.className} inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] w-fit px-2 py-1 ${
                  post.isPublished
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-surface-alt text-text-muted'
                }`}>
                  {post.isPublished ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                  {post.isPublished ? 'Published' : 'Draft'}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: post.id, type: 'blog', title: post.title }); }}
                    className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--page-bg)] border border-border p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-text-primary mb-1`}>
                  Delete {deleteTarget.type === 'blog' ? 'Blog Post' : 'Portfolio Item'}
                </p>
                <p className={`${mono.className} text-[10px] text-text-muted leading-relaxed`}>
                  &ldquo;{deleteTarget.title}&rdquo; will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-4 py-2 border border-border text-text-muted hover:text-text-secondary transition-colors`}
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-4 py-2 bg-red-500 text-white hover:bg-red-400 transition-colors disabled:opacity-40`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}