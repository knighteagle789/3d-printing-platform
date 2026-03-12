'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';
import { publicApiClient } from '@/lib/api-client';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Hook — tracks whether an image URL failed to load ────────────────────────
function useImageWithFallback(src: string | null) {
  const [errored, setErrored] = useState(false);
  // Reset if src changes (e.g. item swapped in list)
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setErrored(false);
  }
  const onError = () => setErrored(true);
  const show = !!src && !errored;
  return { show, onError };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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

  // Build category list from actual data
  const categories = [ALL, ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];

  const filtered = activeCategory === ALL
    ? items
    : items.filter(i => i.category === activeCategory);

  const featured    = items.filter(i => i.isFeatured);
  const showFeatured = activeCategory === ALL && featured.length > 0;

  return (
    <div className="pt-16 bg-[#0d0a06]">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative py-32 px-6 border-b border-white/10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-amber-400/70 mb-6`}>
              Our Work
            </p>
            <h1
              className={`${display.className} text-white leading-[0.88]`}
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
            >
              BUILT HERE.<br />
              <span className="text-amber-400">SHIPPED REAL.</span>
            </h1>
          </div>
          <p className="text-white/50 text-base leading-relaxed max-w-sm md:text-right md:pb-2">
            From functional prototypes to display-quality finished pieces —
            precision in every layer.
          </p>
        </div>
      </section>


      {/* ════════════════════════════ FEATURED ════════════════════════════ */}
      {!isLoading && !isError && showFeatured && (
        <section className="py-20 px-6 border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-10`}>
              Featured
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/8">
              {featured.slice(0, 2).map((item, i) => (
                <FeaturedCard key={item.id} item={item} large={i === 0 && featured.length === 1} />
              ))}
            </div>
          </div>
        </section>
      )}


      {/* ════════════════════════════ GRID ════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Category filter */}
          {!isLoading && !isError && categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-12">
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-white/22 mr-3`}>
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
                      ? 'border-amber-400 text-amber-400 bg-amber-400/8'
                      : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/60'}
                  `}
                >
                  {cat}
                </button>
              ))}
              {activeCategory !== ALL && (
                <span className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/22 ml-2`}>
                  {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/8">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-[#0d0a06] animate-pulse">
                  <div className="aspect-[4/3] bg-white/[0.04]" />
                  <div className="p-5 space-y-2">
                    <div className="h-3 bg-white/[0.05] w-1/3" />
                    <div className="h-4 bg-white/[0.05] w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="border border-white/8 px-6 py-16 text-center">
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-white/25 mb-2`}>
                Unable to load
              </p>
              <p className="text-white/40 text-sm">
                Portfolio couldn&apos;t be loaded right now. Please try refreshing.
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="border border-white/8 px-6 py-16 text-center">
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-white/25 mb-2`}>
                Nothing here yet
              </p>
              <p className="text-white/40 text-sm">
                {activeCategory === ALL
                  ? 'Portfolio items will appear here once published.'
                  : `No items in the "${activeCategory}" category.`}
              </p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/8">
              {filtered.map(item => (
                <PortfolioCard key={item.id} item={item} />
              ))}
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
              Start your project
            </p>
            <h2
              className={`${display.className} text-black leading-[0.88]`}
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}
            >
              YOURS COULD<br />BE NEXT.
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="hidden md:block text-black/50 text-sm max-w-xs text-right leading-relaxed">
              Upload your model and get an instant quote — no commitment required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-zinc-900 transition-colors`}
              >
                Start Your Order <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className={`${mono.className} inline-flex items-center border border-black/20 text-black text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-black/5 transition-colors`}
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


// ─── Featured card (large, hero-style) ───────────────────────────────────────
function FeaturedCard({ item, large }: { item: PortfolioItem; large: boolean }) {
  const { show, onError } = useImageWithFallback(item.imageUrl);
  return (
    <Link
      href={`/portfolio/${item.id}`}
      className={`group relative bg-[#0d0a06] overflow-hidden block ${large ? 'lg:col-span-2' : ''}`}
    >
      {/* Image */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Overlay text */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {item.category && (
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-amber-400/70 mb-2`}>
                  {item.category}
                </p>
              )}
              <h3 className="font-black text-xl tracking-tight" style={{ fontFamily: 'var(--font-epilogue)' }}>
                {item.title}
              </h3>
              {item.material && (
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/35 mt-1.5`}>
                  {item.material.type} · {item.material.color}
                </p>
              )}
            </div>
            <div className="shrink-0 w-9 h-9 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
      className="group relative bg-[#0d0a06] overflow-hidden block hover:bg-[#111009] transition-colors"
    >
      {/* Image */}
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

        {/* Featured badge */}
        {item.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className={`${mono.className} text-[8px] uppercase tracking-[0.2em] bg-amber-400 text-black px-2 py-1 font-semibold`}>
              Featured
            </span>
          </div>
        )}

        {/* Hover arrow */}
        <div className="absolute top-3 right-3 w-8 h-8 border border-white/20 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ArrowUpRight className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="p-5 border-t border-white/8">
        {item.category && (
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-amber-400/55 mb-2`}>
            {item.category}
          </p>
        )}
        <h3 className="font-black text-base tracking-tight mb-2" style={{ fontFamily: 'var(--font-epilogue)' }}>
          {item.title}
        </h3>
        {item.description && (
          <p className="text-white/45 text-xs leading-relaxed mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          {item.material ? (
            <span className={`${mono.className} text-[8.5px] uppercase tracking-[0.15em] text-white/28`}>
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
                  className={`${mono.className} text-[8px] uppercase tracking-[0.12em] border border-white/8 px-2 py-0.5 text-white/28`}
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 2 && (
                <span className={`${mono.className} text-[8px] text-white/20`}>
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


// ─── Placeholder for missing images ──────────────────────────────────────────
function PortfolioPlaceholder({ title }: { title: string }) {
  // Deterministic "color" from title so the same item always gets the same shade
  const hue = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: `hsl(${hue}, 12%, 10%)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="w-10 h-10 border opacity-20 mb-3"
        style={{ borderColor: `hsl(${hue}, 60%, 55%)` }}
      />
      <p className={`${mono.className} text-[8px] uppercase tracking-[0.3em] text-white/18`}>
        NoCo Make Lab. <br />3D Print
      </p>
    </div>
  );
}