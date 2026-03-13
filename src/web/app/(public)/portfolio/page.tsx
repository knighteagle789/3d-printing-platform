'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';
import { publicApiClient } from '@/lib/api-client';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

interface PortfolioMaterial {
  id:     string;
  type:   string;
  color:  string;
  finish: string | null;
}

interface PortfolioItem {
  id:                  string;
  title:               string;
  description:         string;
  detailedDescription: string | null;
  imageUrl:            string | null;
  additionalImages:    { url: string; caption?: string; altText?: string; order: number }[] | null;
  tags:                string[] | null;
  isFeatured:          boolean;
  category:            string;
  modelFileUrl:        string | null;
  projectDetails:      string | null;
  material:            PortfolioMaterial | null;
}

type PortfolioResponse = PortfolioItem[] | { items: PortfolioItem[] };

const ALL = 'All';

function useImageWithFallback(src: string | null) {
  const [errored, setErrored] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) { setLastSrc(src); setErrored(false); }
  return { show: !!src && !errored, onError: () => setErrored(true) };
}

export default function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState<string>(ALL);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio'],
    queryFn:  () => publicApiClient.get<PortfolioResponse>('/Content/portfolio?page=1&pageSize=50'),
  });

  const raw   = data?.data;
  const items: PortfolioItem[] = raw
    ? Array.isArray(raw) ? raw : (raw.items ?? [])
    : [];

  const categories = [ALL, ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];

  const filtered = activeCategory === ALL
    ? items
    : items.filter(i => i.category === activeCategory);

  const featured    = items.filter(i => i.isFeatured);
  const showFeatured = activeCategory === ALL && featured.length > 0;

  return (
    <div className="pt-16 bg-page">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative py-32 px-6 border-b border-border overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-accent/70 mb-6`}>
              Our Work
            </p>
            <h1
              className={`${display.className} text-text-primary leading-[0.88]`}
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
            >
              BUILT HERE.<br />
              <span className="text-accent">SHIPPED REAL.</span>
            </h1>
          </div>
          <p className="text-text-secondary text-base leading-relaxed max-w-sm md:text-right md:pb-2">
            From functional prototypes to display-quality finished pieces —
            precision in every layer.
          </p>
        </div>
      </section>


      {/* ════════════════════════════ FEATURED ════════════════════════════ */}
      {!isLoading && !isError && showFeatured && (
        <section className="py-20 px-6 border-b border-border bg-surface-alt">
          <div className="max-w-7xl mx-auto">
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-10`}>
              Featured
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">
              {featured.slice(0, 2).map((item, i) => (
                <FeaturedCard key={item.id} item={item} large={i === 0 && featured.length === 1} />
              ))}
            </div>
          </div>
        </section>
      )}


      {/* ════════════════════════════ GRID ════════════════════════════ */}
      <section className="py-20 px-6 bg-page">
        <div className="max-w-7xl mx-auto">

          {/* Category filter */}
          {!isLoading && !isError && categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-12">
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-text-muted mr-3`}>
                Filter
              </p>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    ${mono.className} text-[10px] uppercase tracking-[0.18em] px-4 h-8
                    border transition-colors
                    ${activeCategory === cat
                      ? 'border-accent text-accent bg-accent-light'
                      : 'border-border text-text-muted hover:border-border-strong hover:text-text-secondary'}
                  `}
                >
                  {cat}
                </button>
              ))}
              {activeCategory !== ALL && (
                <span className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted ml-2`}>
                  {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-surface animate-pulse">
                  <div className="aspect-[4/3] bg-surface-alt" />
                  <div className="p-5 space-y-2">
                    <div className="h-3 bg-surface-alt w-1/3" />
                    <div className="h-4 bg-surface-alt w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="border border-border bg-surface px-6 py-16 text-center">
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-text-muted mb-2`}>
                Unable to load
              </p>
              <p className="text-text-secondary text-sm">
                Portfolio couldn&apos;t be loaded right now. Please try refreshing.
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="border border-border bg-surface px-6 py-16 text-center">
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-text-muted mb-2`}>
                Nothing here yet
              </p>
              <p className="text-text-secondary text-sm">
                {activeCategory === ALL
                  ? 'Portfolio items will appear here once published.'
                  : `No items in the "${activeCategory}" category.`}
              </p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {filtered.map(item => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ════════════════════════════ CTA ════════════════════════════ */}
      <section className="relative overflow-hidden bg-accent">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-28 flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
          <div>
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-white/50 mb-5`}>
              Start your project
            </p>
            <h2
              className={`${display.className} text-white leading-[0.88]`}
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}
            >
              YOURS COULD<br />BE NEXT.
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="hidden md:block text-white/60 text-sm max-w-xs text-right leading-relaxed">
              Upload your model and get an instant quote — no commitment required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-white text-accent text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-white/90 transition-colors`}
              >
                Start Your Order <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className={`${mono.className} inline-flex items-center border border-white/30 text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-white/10 transition-colors`}
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── Featured card ────────────────────────────────────────────────────────────
function FeaturedCard({ item, large }: { item: PortfolioItem; large: boolean }) {
  const { show, onError } = useImageWithFallback(item.imageUrl);
  return (
    <Link
      href={`/portfolio/${item.id}`}
      className={`group relative bg-surface overflow-hidden block ${large ? 'lg:col-span-2' : ''}`}
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        {show ? (
          <img
            src={item.imageUrl!}
            alt={item.title}
            onError={onError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <PortfolioPlaceholder title={item.title} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {item.category && (
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-white/70 mb-2`}>
                  {item.category}
                </p>
              )}
              <h3 className="font-black text-xl tracking-tight text-white" style={{ fontFamily: 'var(--font-epilogue)' }}>
                {item.title}
              </h3>
              {item.material && (
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/45 mt-1.5`}>
                  {item.material.type} · {item.material.color}
                </p>
              )}
            </div>
            <div className="shrink-0 w-9 h-9 border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ArrowUpRight className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Standard grid card ───────────────────────────────────────────────────────
function PortfolioCard({ item }: { item: PortfolioItem }) {
  const { show, onError } = useImageWithFallback(item.imageUrl);
  return (
    <Link
      href={`/portfolio/${item.id}`}
      className="group relative bg-surface overflow-hidden block hover:bg-surface-alt transition-colors"
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {show ? (
          <img
            src={item.imageUrl!}
            alt={item.title}
            onError={onError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <PortfolioPlaceholder title={item.title} />
        )}

        {item.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className={`${mono.className} text-[8px] uppercase tracking-[0.2em] bg-accent text-white px-2 py-1 font-semibold`}>
              Featured
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3 w-8 h-8 border border-white/30 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ArrowUpRight className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      <div className="p-5 border-t border-border">
        {item.category && (
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-accent/60 mb-2`}>
            {item.category}
          </p>
        )}
        <h3 className="font-black text-base tracking-tight mb-2 text-text-primary group-hover:text-accent transition-colors" style={{ fontFamily: 'var(--font-epilogue)' }}>
          {item.title}
        </h3>
        {item.description && (
          <p className="text-text-secondary text-xs leading-relaxed mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          {item.material ? (
            <span className={`${mono.className} text-[8.5px] uppercase tracking-[0.15em] text-text-muted`}>
              {item.material.type} · {item.material.color}
            </span>
          ) : (
            <span />
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5">
              {item.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className={`${mono.className} text-[8px] uppercase tracking-[0.12em] border border-border px-2 py-0.5 text-text-muted`}
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 2 && (
                <span className={`${mono.className} text-[8px] text-text-muted`}>
                  +{item.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Placeholder ──────────────────────────────────────────────────────────────
function PortfolioPlaceholder({ title }: { title: string }) {
  const hue = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: `hsl(${hue}, 12%, 93%)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="w-10 h-10 border opacity-20 mb-3"
        style={{ borderColor: `hsl(${hue}, 45%, 45%)` }}
      />
      <p className={`${mono.className} text-[8px] uppercase tracking-[0.3em] text-text-muted`}>
        NoCo Make Lab. <br />3D Print
      </p>
    </div>
  );
}