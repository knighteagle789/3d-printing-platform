'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { contentApi } from '@/lib/api/content';
import { ArrowRight, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogPostSummary {
  id:          string;
  title:       string;
  slug:        string;
  excerpt:     string | null;
  authorName:  string;
  publishedAt: string;
  tags:        string[];
  featuredImageUrl?: string | null;
}

interface PagedBlogResponse {
  items:      BlogPostSummary[];
  totalCount: number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [page, setPage]           = useState(1);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['blog', page],
    queryFn:  () => contentApi.getBlogPosts(page, 9),
  });

  const response   = data?.data as PagedBlogResponse | undefined;
  const allPosts   = response?.items ?? [];
  const totalPages = response?.totalPages ?? 1;

  // Collect unique tags from the current page — sorted alphabetically
  const allTags = Array.from(
    new Set(allPosts.flatMap(p => p.tags ?? []))
  ).sort();

  // Filter client-side; when a tag is active the featured layout is skipped
  const posts = activeTag
    ? allPosts.filter(p => p.tags?.includes(activeTag))
    : allPosts;

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => (prev === tag ? null : tag));
    setPage(1);
  };

  return (
    <div className="pt-16 bg-[#0d0a06]">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative py-28 px-6 border-b border-white/10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end gap-8 justify-between">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-amber-400/70 mb-6`}>
              Insights & Updates
            </p>
            <h1
              className={`${display.className} text-white leading-[0.88]`}
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
            >
              THE<br />
              BLOG<span className="text-amber-400">.</span>
            </h1>
          </div>
          <p className="text-white/40 text-base leading-relaxed max-w-sm md:mb-3">
            Material guides, project spotlights, tips on print settings,
            and updates from the shop floor.
          </p>
        </div>
      </section>

      {/* ════════════════════════════ TAG FILTER ════════════════════════════ */}
      {!isLoading && allTags.length > 0 && (
        <div className="border-b border-white/8 px-6 py-4 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center gap-2 flex-nowrap min-w-0">
            <span className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/22 shrink-0 mr-2`}>
              Filter
            </span>
            <button
              onClick={() => { setActiveTag(null); setPage(1); }}
              className={`${mono.className} shrink-0 text-[9px] uppercase tracking-[0.18em] px-3 h-7 border transition-colors ${
                activeTag === null
                  ? 'bg-amber-400 text-black border-amber-400'
                  : 'border-white/12 text-white/35 hover:text-white hover:border-white/30'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`${mono.className} shrink-0 text-[9px] uppercase tracking-[0.18em] px-3 h-7 border transition-colors ${
                  activeTag === tag
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'border-white/12 text-white/35 hover:text-white hover:border-white/30'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════ GRID ════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">

          {isLoading ? (
            <LoadingSkeleton />
          ) : posts.length === 0 ? (
            <EmptyState monoClass={mono.className} filtered={activeTag !== null} />
          ) : (
            <>
              {/* Featured wide card — only shown when not filtering */}
              {!activeTag && (
                <div className="mb-px">
                  <FeaturedCard post={posts[0]} monoClass={mono.className} />
                </div>
              )}

              {/* Grid — all posts when filtering, remaining when not */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/8 mt-px">
                {(activeTag ? posts : posts.slice(1)).map((post) => (
                  <PostCard key={post.id} post={post} monoClass={mono.className} />
                ))}
              </div>
            </>
          )}

          {/* Pagination — hide when filtering (client-side, no pages needed) */}
          {!activeTag && totalPages > 1 && (
            <div className={`${mono.className} flex items-center justify-center gap-6 mt-16`}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 text-[10px] tracking-wide transition-colors border ${
                      n === page
                        ? 'bg-amber-400 text-black border-amber-400 font-semibold'
                        : 'border-white/10 text-white/35 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════ CTA ════════════════════════════ */}
      <section className="relative overflow-hidden bg-amber-400">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-28 flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
          <div>
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-black/32 mb-5`}>
              Ready to print?
            </p>
            <h2
              className={`${display.className} text-black leading-[0.88]`}
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}
            >
              TURN YOUR<br />DESIGN INTO<br />REALITY<span className="text-black/40">.</span>
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="hidden md:block text-black/50 text-sm max-w-xs text-right leading-relaxed">
              Upload your model and get an instant quote — no account required to start.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-zinc-900 transition-colors`}
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className={`${mono.className} inline-flex items-center border border-black/20 text-black text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-black/5 transition-colors`}
              >
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── Featured card (first post, full width) ────────────────────────────────────

function FeaturedCard({ post, monoClass }: { post: BlogPostSummary; monoClass: string }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="group relative border border-white/8 bg-[#0d0a06] hover:bg-white/[0.02] transition-colors overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5">

          {/* Image / placeholder */}
          <div className="lg:col-span-2 aspect-video lg:aspect-auto min-h-[200px] relative bg-white/[0.03] overflow-hidden">
            {post.featuredImageUrl ? (
              <img
                src={post.featuredImageUrl}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            ) : (
              <FeaturedPlaceholder title={post.title} />
            )}
          </div>

          {/* Content */}
          <div className="lg:col-span-3 p-10 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <FeaturedBadge monoClass={monoClass} />
                {post.tags?.slice(0, 2).map(tag => (
                  <TagPill key={tag} tag={tag} monoClass={monoClass} />
                ))}
              </div>
              <h2
                className="font-black tracking-tight leading-[1.1] mb-4 group-hover:text-amber-400 transition-colors"
                style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
              >
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-white/45 text-sm leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              )}
            </div>
            <Meta post={post} showArrow monoClass={monoClass} />
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Regular card ─────────────────────────────────────────────────────────────

function PostCard({ post, monoClass }: { post: BlogPostSummary; monoClass: string }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="group bg-[#0d0a06] hover:bg-white/[0.025] transition-colors h-full flex flex-col p-8">
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {post.tags.slice(0, 2).map(tag => (
              <TagPill key={tag} tag={tag} monoClass={monoClass} />
            ))}
          </div>
        )}

        <h2
          className="font-black tracking-tight leading-[1.15] mb-3 flex-1 group-hover:text-amber-400 transition-colors"
          style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
        >
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-white/40 text-sm leading-relaxed mb-5 line-clamp-2">
            {post.excerpt}
          </p>
        )}

        <Meta post={post} showArrow monoClass={monoClass} />
      </article>
    </Link>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Meta({ post, showArrow, monoClass }: { post: BlogPostSummary; showArrow?: boolean; monoClass: string }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/8">
      <div className={`${monoClass} flex items-center gap-4 text-[9px] uppercase tracking-[0.18em] text-white/28`}>
        <span className="flex items-center gap-1.5">
          <User className="h-2.5 w-2.5" /> {post.authorName}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-2.5 w-2.5" /> {formatDate(post.publishedAt)}
        </span>
      </div>
      {showArrow && (
        <ArrowRight className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

function TagPill({ tag, monoClass }: { tag: string; monoClass: string }) {
  return (
    <span className={`${monoClass} text-[8px] uppercase tracking-[0.18em] border border-amber-400/25 text-amber-400/60 px-2 py-0.5`}>
      {tag}
    </span>
  );
}

function FeaturedBadge({ monoClass }: { monoClass: string }) {
  return (
    <span className={`${monoClass} text-[8px] uppercase tracking-[0.18em] bg-amber-400 text-black px-2 py-0.5`}>
      Latest
    </span>
  );
}

function FeaturedPlaceholder({ title }: { title: string }) {
  const hue = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ background: `hsl(${hue}, 20%, 10%)` }}>
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-px">
      <div className="animate-pulse bg-white/[0.04] h-72 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-[#0d0a06] h-52" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ monoClass, filtered }: { monoClass: string; filtered?: boolean }) {
  return (
    <div className="py-32 text-center">
      <p className={`${monoClass} text-[10px] uppercase tracking-[0.25em] text-white/20`}>
        {filtered ? 'No posts match that tag.' : 'No posts yet — check back soon.'}
      </p>
    </div>
  );
}