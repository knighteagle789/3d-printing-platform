'use client';

import { display, mono } from '@/lib/fonts';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, X } from 'lucide-react';
import { materialsApi, type Material } from '@/lib/api/materials';
import { contentApi, type PortfolioItemResponse } from '@/lib/api/content';
import { groupMaterials, type MaterialGroup } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

// ─── Fonts ────────────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────
const LAYER_COUNT = 72;

const TICKER_ITEMS = [
  { type: 'phrase',   text: 'Precision in every layer' },
  { type: 'material', text: 'PLA'    },
  { type: 'material', text: 'PETG'   },
  { type: 'material', text: 'ABS'    },
  { type: 'material', text: 'TPU'    },
  { type: 'phrase',   text: 'Precision in every layer' },
  { type: 'material', text: 'Nylon'  },
  { type: 'material', text: 'Resin'  },
  { type: 'material', text: 'Carbon' },
  { type: 'material', text: 'ASA'    },
];

// Front Range silhouette
const MTN_POINTS =
  '0,100 4,82 8,72 12,78 17,60 22,40 27,26 31,22 36,32 40,28 44,20 49,36 54,30 58,45 63,38 68,52 73,60 79,68 85,75 92,82 100,100';

const MTN_CLIP = `polygon(${MTN_POINTS.split(' ').map(p => {
  const [x, y] = p.split(',');
  return `${x}% ${y}%`;
}).join(', ')})`;

// Teal gradient — dark at base, light at peak (inverted for light bg)
function layerColor(i: number, total: number): string {
  const pct = 1 - (i / total); // invert: i=0 is bottom, i=total is top
  if (pct > 0.88) {
    const t = (pct - 0.88) / 0.12;
    return `rgba(13, 148, 136, ${0.55 + t * 0.4})`; // deep teal — base
  }
  if (pct > 0.52) {
    const t = (pct - 0.52) / 0.36;
    return `rgba(20, 184, 166, ${0.25 + t * 0.35})`; // mid teal
  }
  const t = pct / 0.52;
  return `rgba(94, 234, 212, ${0.08 + t * 0.18})`; // pale teal wash — peak
}

// ─── Process steps ────────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    n: '01', title: 'Upload',
    desc: 'STL, OBJ, or 3MF up to 200MB. Your file is stored securely and checked for geometry issues before you place the order.',
  },
  {
    n: '02', title: 'Configure',
    desc: 'Choose material, layer height, infill, and quantity. A live price estimate updates as you go — no surprises at checkout.',
  },
  {
    n: '03', title: 'We Print',
    desc: 'Your job enters the queue. Track status from queued through printing and quality check, right from your dashboard.',
  },
  {
    n: '04', title: 'Delivered',
    desc: 'Every print is inspected before it ships. We offer shipping across Northern Colorado and local pickup in Fort Collins.',
  },
];

// ─── Material type tile ───────────────────────────────────────────────────────
function MaterialTile({
  group,
  onClick,
}: {
  group: MaterialGroup;
  onClick: () => void;
}) {
  const priceLabel =
    group.minPrice === group.maxPrice
      ? `$${group.minPrice.toFixed(3)}/g`
      : `$${group.minPrice.toFixed(3)} – $${group.maxPrice.toFixed(3)}/g`;

  return (
    <button
      onClick={onClick}
      className="border border-border bg-surface p-5 text-left hover:border-accent/50 hover:bg-accent-light hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      <div
        className="font-black text-xl tracking-tight mb-2 transition-colors group-hover:text-accent"
        style={{ fontFamily: 'var(--font-epilogue)' }}
      >
        {group.type}
      </div>
      <div className={`${mono.className} text-[8.5px] text-text-muted uppercase tracking-wide mb-1.5`}>
        {group.variants.length === 1
          ? '1 variant'
          : `${group.variants.length} variants`}
      </div>
      <div className={`${mono.className} text-[9px] text-accent/70`}>
        {priceLabel}
      </div>
    </button>
  );
}

// ─── Material type modal ──────────────────────────────────────────────────────
function MaterialGroupModal({
  group,
  onClose,
}: {
  group: MaterialGroup;
  onClose: () => void;
}) {
  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-lg bg-surface border border-border shadow-xl p-8 max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modalIn 0.18s ease-out both' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-accent mb-2`}>
          Material
        </p>
        <h3 className="font-black text-4xl leading-[1.15] mb-1 text-text-primary" style={{ fontFamily: 'var(--font-epilogue)' }}>
          {group.type}
        </h3>
        <p className={`${mono.className} text-[10px] text-text-muted uppercase tracking-[0.18em] mb-8`}>
          {group.variants.length} {group.variants.length === 1 ? 'variant' : 'variants'} available
        </p>

        {/* Variant list */}
        <div className="space-y-2 mb-8">
          {group.variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between border border-border px-5 py-4 hover:border-border-strong transition-colors"
            >
              <div>
                <div className="font-semibold text-sm text-text-primary" style={{ fontFamily: 'var(--font-epilogue)' }}>
                  {v.color}
                </div>
                <div className={`${mono.className} text-[8.5px] text-text-muted uppercase tracking-wide mt-0.5`}>
                  {[v.finish, v.grade].filter(Boolean).join(' · ') || 'Standard'}
                </div>
              </div>
              <div className={`${display.className} text-accent text-2xl`}>
                ${v.pricePerGram.toFixed(3)}<span className={`${mono.className} text-[10px] text-text-muted font-normal ml-0.5`}>/g</span>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        {group.variants.find(v => v.description) && (
          <p className="text-text-secondary text-sm leading-relaxed mb-8 border-l-2 border-accent/30 pl-4">
            {group.variants.find(v => v.description)!.description}
          </p>
        )}

        <Link
          href="/pricing"
          className={`${mono.className} w-full flex items-center justify-center gap-2 bg-accent text-white text-[11px] uppercase tracking-[0.18em] font-semibold h-11 hover:bg-accent/90 transition-colors`}
        >
          See Full Pricing <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Portfolio card ───────────────────────────────────────────────────────────
function PortfolioCard({
  item,
  mono: monoClass,
  display: displayClass,
}: {
  item:    PortfolioItemResponse;
  mono:    string;
  display: string;
}) {
  const [imgError, setImgError] = useState(false);
  const isAbsoluteUrl = item.imageUrl?.startsWith('http');

  return (
    <Link
      href={`/portfolio/${item.id}`}
      className="group bg-surface block hover:bg-surface-alt transition-colors"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
        {!imgError && isAbsoluteUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <div
              className={`${displayClass} text-text-primary/[0.08] select-none leading-none text-center px-4`}
              style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}
            >
              {item.category.toUpperCase()}
            </div>
            <div className={`${monoClass} text-[9px] uppercase tracking-[0.25em] text-accent/40 mt-3`}>
              Photo coming soon
            </div>
          </div>
        )}

        {/* Featured badge */}
        {item.isFeatured && (
          <div className={`${monoClass} absolute top-3 left-3 bg-accent text-white text-[8px] uppercase tracking-[0.18em] font-semibold px-2 py-0.5`}>
            Featured
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      </div>

      {/* Card body */}
      <div className="p-6 border-t border-border">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className={`${monoClass} text-[9px] uppercase tracking-[0.2em] text-accent/70`}>
            {item.category}
          </div>
          {item.material && (
            <div className={`${monoClass} text-[8.5px] uppercase tracking-[0.15em] text-text-muted shrink-0`}>
              {item.material.type} · {item.material.color}
            </div>
          )}
        </div>
        <h3 className="font-black text-base leading-snug mb-2 group-hover:text-accent transition-colors"
          style={{ fontFamily: 'var(--font-epilogue)' }}>
          {item.title}
        </h3>
        <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
          {item.description}
        </p>
        <div className={`${monoClass} mt-4 text-[9px] uppercase tracking-[0.2em] text-text-muted flex items-center gap-1.5 group-hover:text-accent transition-colors`}>
          View project <ArrowRight className="h-2.5 w-2.5" />
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [layerCount,    setLayerCount]    = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<MaterialGroup | null>(null);

  const handleStartPrinting = () => {
    if (isAuthenticated) {
      router.push('/upload');
    } else {
      router.push('/register?redirect=/upload');
    }
  };

  const { data: materialsData } = useQuery({
    queryKey: ['materials-public'],
    queryFn:  () => materialsApi.getAll(),
  });
  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio-featured'],
    queryFn:  () => contentApi.getFeaturedPortfolio(3),
  });
  const materials      = materialsData?.data.filter(m => m.isActive) ?? [];
  const materialGroups = groupMaterials(materials);
  const typeCount      = materialGroups.length;
  const featuredItems  = (portfolioData?.data ?? []) as PortfolioItemResponse[];

  useEffect(() => {
    let current = 0;
    const tick = () => {
      current += 1;
      if (current >= LAYER_COUNT) { setLayerCount(LAYER_COUNT); return; }
      setLayerCount(current);
      setTimeout(tick, 72 + Math.random() * 28);
    };
    const t = setTimeout(tick, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes layerIn {
          from { opacity: 0; transform: scaleX(0); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .layer-bar  { animation: layerIn 0.14s ease-out both; transform-origin: left; }
        .fade-up    { animation: fadeUp  0.8s  ease-out both; }
        .ticker-run { animation: ticker  42s   linear infinite; }
        .dot-pulse  { animation: pulseGlow 2s  ease-in-out infinite; }
      `}</style>

      {selectedGroup && (
        <MaterialGroupModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />
      )}

      <div className="pt-16">

        {/* ════════════════════════════ HERO ════════════════════════════ */}
        <section className="relative min-h-[100svh] flex flex-col bg-page overflow-x-hidden">
          {/* Subtle grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '300px',
            }}
          />
          {/* Ambient teal glow */}
          <div className="pointer-events-none absolute top-1/3 -left-48 w-[560px] h-[560px] rounded-full bg-accent/5 blur-[140px]" />

          <div className="relative flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-6">
            {/* Left — headline */}
            <div className="flex-1 flex flex-col justify-center py-14 md:py-24 pr-0 md:pr-16">
              <div className="fade-up flex items-center gap-2.5 mb-10" style={{ animationDelay: '0.05s' }}>
                <span className="dot-pulse w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-accent/70`}>
                  Northern Colorado · Est. 2024
                </span>
              </div>

              <div className="fade-up" style={{ animationDelay: '0.15s' }}>
                <h1
                  className={`${display.className} text-text-primary leading-[0.88]`}
                  style={{ fontSize: 'clamp(5.5rem, 13vw, 9.5rem)' }}
                >
                  NOCO<br />
                  <span className="text-accent">MAKE</span><br />
                  LAB.
                </h1>
              </div>

              <div className="fade-up mt-8 mb-11" style={{ animationDelay: '0.3s' }}>
                <p className="text-text-secondary text-[1.05rem] leading-relaxed max-w-[22rem]">
                  Precision 3D printing for engineers, designers, and
                  makers — right here in Northern Colorado.
                </p>
              </div>

              <div className="fade-up flex flex-wrap gap-3" style={{ animationDelay: '0.45s' }}>
                <button
                  onClick={handleStartPrinting}
                  className={`${mono.className} inline-flex items-center gap-2.5 bg-accent text-white text-[11px] font-semibold uppercase tracking-[0.18em] px-7 h-12 hover:bg-accent/90 transition-colors`}
                >
                  Start Printing <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <Link
                  href="/portfolio"
                  className={`${mono.className} inline-flex items-center border border-border text-text-secondary text-[11px] uppercase tracking-[0.18em] px-7 h-12 hover:text-text-primary hover:border-border-strong transition-colors`}
                >
                  View Our Work
                </Link>
              </div>
            </div>

            {/* Right — mountain print viz */}
            <div className="flex w-full md:w-[46%] items-end pt-0 pb-10 md:py-16 relative">
              <div className="relative w-full" style={{ height: 'min(38vw, 520px)', minHeight: '200px' }}>
                {/* Grid background */}
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }}
                />

                {/* Layer counter */}
                <div className={`${mono.className} hidden md:block absolute top-5 right-3 z-20 text-right leading-none`}>
                  <div className="text-[8px] uppercase tracking-[0.28em] text-text-muted mb-1">Layer</div>
                  <div className="tabular-nums font-semibold text-accent" style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)' }}>
                    {String(layerCount).padStart(3, '0')}
                    <span className="text-text-muted"> / {LAYER_COUNT}</span>
                  </div>
                  <div className={`text-[8px] uppercase tracking-[0.2em] mt-1 text-accent/60 transition-opacity duration-500 ${layerCount >= LAYER_COUNT ? 'opacity-100' : 'opacity-0'}`}>
                    Complete ✓
                  </div>
                </div>

                {/* Filled layers */}
                <div className="absolute inset-0" style={{ clipPath: MTN_CLIP }}>
                  {Array.from({ length: LAYER_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className="layer-bar absolute left-0 right-0"
                      style={{
                        height:         `calc(${100 / LAYER_COUNT}% - 1.4px)`,
                        bottom:         `calc(${(i / LAYER_COUNT) * 100}% + 0.7px)`,
                        background:      layerColor(i, LAYER_COUNT),
                        animationDelay: `${i * 0.082}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Mountain outline */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full fade-up pointer-events-none"
                  style={{ animationDelay: `${LAYER_COUNT * 0.082 + 0.6}s` }}
                >
                  <polyline
                    points={MTN_POINTS}
                    fill="none"
                    stroke="rgba(13,148,136,0.5)"
                    strokeWidth="0.42"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* Active print-head line */}
                {layerCount > 0 && layerCount < LAYER_COUNT && (
                  <div
                    className="absolute left-0 right-0 h-px pointer-events-none z-10"
                    style={{
                      bottom:    `${(layerCount / LAYER_COUNT) * 100}%`,
                      background: 'rgba(13,148,136,0.5)',
                      boxShadow:  '0 0 8px rgba(13,148,136,0.25)',
                    }}
                  />
                )}

                <div className="absolute bottom-0 left-0 right-0 h-px bg-accent/20" />
                <div className="absolute bottom-0 left-0 top-0 w-px bg-border" />
                <div className="absolute bottom-0 left-1/4 right-1/4 h-24 bg-accent/5 blur-3xl pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="border-t border-border">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4">
              {[
                { v: typeCount > 0 ? `${typeCount}` : '—', l: 'Material types' },
                { v: '0.1mm', l: 'Min layer height'   },
                { v: 'FDM',   l: 'Technology'         },
                { v: '~1 wk', l: 'Typical turnaround' },
              ].map(({ v, l }) => (
                <div key={l} className="py-5 px-5 border-r border-border last:border-0 first:pl-0">
                  <div className={`${display.className} text-3xl text-accent`}>{v}</div>
                  <div className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted mt-0.5`}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ════════════════════════════ TICKER ════════════════════════════ */}
        <div className="bg-accent overflow-hidden py-3.5 select-none">
          <div className="flex whitespace-nowrap ticker-run">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span
                key={i}
                className={`${mono.className} mx-8 text-[11px] uppercase tracking-[0.22em]
                  ${item.type === 'phrase' ? 'text-white font-semibold' : 'text-white/50'}`}
              >
                {item.text}
                <span className="ml-8 text-white/25">·</span>
              </span>
            ))}
          </div>
        </div>


        {/* ════════════════════════════ PORTFOLIO PREVIEW ════════════════════════════ */}
        <section className="py-36 px-6 bg-page border-t border-border">
          <div className="max-w-7xl mx-auto">

            <div className="flex items-end justify-between gap-8 mb-16">
              <div>
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
                  Our Work
                </p>
                <h2
                  className="font-black tracking-tight leading-[1.15] text-text-primary"
                  style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
                >
                  Built here.<br />Shipped real.
                </h2>
              </div>
              <Link
                href="/portfolio"
                className={`${mono.className} hidden md:inline-flex items-center gap-2 text-text-muted text-[11px] uppercase tracking-[0.22em] hover:text-accent transition-colors group shrink-0`}
              >
                View all work
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {featuredItems.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="bg-surface">
                    <div className="aspect-[4/3] bg-surface-alt animate-pulse" />
                    <div className="p-6 space-y-2">
                      <div className="h-2 w-16 bg-surface-alt animate-pulse" />
                      <div className="h-3 w-32 bg-surface-alt animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                {featuredItems.map((item, i) => (
                  <PortfolioCard key={item.id} item={item} mono={mono.className} display={display.className} />
                ))}
              </div>
            )}

            <div className="mt-10 md:hidden">
              <Link
                href="/portfolio"
                className={`${mono.className} inline-flex items-center gap-2 text-accent text-[11px] uppercase tracking-[0.22em] group`}
              >
                View all work
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>


        {/* ════════════════════════════ PROCESS ════════════════════════════ */}
        <section className="py-36 px-6 bg-surface-alt border-t border-border">
          <div className="max-w-7xl mx-auto">

            <div className="flex items-end justify-between gap-8 mb-20">
              <div>
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
                  Process
                </p>
                <h2
                  className="font-black tracking-tight leading-[1.15] text-text-primary"
                  style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
                >
                  From file<br />to finished.
                </h2>
              </div>
              <p className="hidden md:block text-text-muted text-sm max-w-[9rem] text-right leading-relaxed">
                Four steps.<br />Zero complexity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 border border-border">
              {PROCESS_STEPS.map((step) => (
                <div
                  key={step.n}
                  className="relative p-8 border-b md:border-b-0 md:border-r border-border last:border-0 hover:bg-accent-light transition-colors group overflow-hidden bg-surface"
                >
                  {/* Ghost step number */}
                  <div
                    className={`${display.className} absolute -bottom-2 -right-1 text-text-primary/[0.04] pointer-events-none select-none leading-none`}
                    style={{ fontSize: '8rem' }}
                  >
                    {step.n}
                  </div>
                  <div className="relative">
                    <div className="w-6 h-0.5 bg-accent/30 mb-6 group-hover:w-14 group-hover:bg-accent transition-all duration-300" />
                    <p className={`${mono.className} text-[10px] uppercase tracking-[0.22em] text-accent/60 mb-3`}>
                      {step.n}
                    </p>
                    <h3 className="font-black text-2xl mb-4 tracking-tight text-text-primary" style={{ fontFamily: 'var(--font-epilogue)' }}>
                      {step.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ════════════════════════════ MATERIALS ════════════════════════════ */}
        <section className="py-36 px-6 border-t border-border bg-page">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 items-start">

              <div className="lg:col-span-2">
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
                  Materials
                </p>
                <h2
                  className="font-black tracking-tight leading-[1.15] mb-5 text-text-primary"
                  style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
                >
                  Right tool.<br />Right material.
                </h2>
                <p className="text-text-secondary leading-relaxed text-sm mb-10 max-w-xs">
                  From flexible TPU to engineering-grade Nylon — stocked for
                  what professional work demands. Priced per gram, no surprises.
                </p>
                <Link
                  href="/pricing"
                  className={`${mono.className} inline-flex items-center gap-2 text-accent text-[11px] uppercase tracking-[0.22em] group`}
                >
                  Full pricing list
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="lg:col-span-3">
                {materialGroups.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className="h-[4.5rem] bg-surface-alt animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {materialGroups.map((group) => (
                      <MaterialTile
                        key={group.type}
                        group={group}
                        onClick={() => setSelectedGroup(group)}
                      />
                    ))}
                  </div>
                )}
                <p className={`${mono.className} text-[8.5px] text-text-muted uppercase tracking-[0.2em] mt-4`}>
                  Tap any type for colors &amp; pricing ↗
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* ════════════════════════════ WHY NOCO ════════════════════════════ */}
        <section className="py-36 px-6 border-t border-border bg-surface-alt">
          <div className="max-w-7xl mx-auto">
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
              Why NoCo Make Lab
            </p>
            <h2
              className="font-black tracking-tight leading-[1.15] mb-20 text-text-primary"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
            >
              Local shop.<br />Pro results.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
              {[
                {
                  tag:   'Precision',
                  title: 'Layer heights down to 0.1mm',
                  desc:  'Settings dialled in per geometry and material — not a one-size preset. Every print is configured for the specific job.',
                },
                {
                  tag:   'Turnaround',
                  title: 'Typically around one week',
                  desc:  "As a side-business we're upfront about capacity. Complex jobs or rush requests? Reach out first and we'll give you an honest timeline.",
                },
                {
                  tag:   'Honesty',
                  title: 'No hidden fees. Ever.',
                  desc:  'Weight × material rate. You see the full total before you submit. No setup fees, no surprise charges at the end.',
                },
              ].map((c) => (
                <div key={c.tag} className="bg-surface p-10 hover:bg-accent-light transition-colors">
                  <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-accent/55 mb-6`}>
                    {c.tag}
                  </p>
                  <h3 className="font-black text-xl leading-snug mb-4 text-text-primary" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {c.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
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
          <div className="relative max-w-7xl mx-auto px-6 py-36 md:py-44">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-14">
              <div>
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-white/50 mb-6`}>
                  Get Started
                </p>
                <h2
                  className={`${display.className} text-white leading-[0.88]`}
                  style={{ fontSize: 'clamp(4.5rem, 12vw, 8.5rem)' }}
                >
                  READY<br />TO PRINT?
                </h2>
              </div>
              <div className="flex flex-col items-start md:items-end gap-5">
                <p className="hidden md:block text-white/60 text-sm max-w-xs text-right leading-relaxed">
                  Upload your file, configure your print, and get an estimate in minutes.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleStartPrinting}
                    className={`${mono.className} inline-flex items-center gap-2 bg-white text-accent text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-white/90 transition-colors`}
                  >
                    {isAuthenticated ? 'Start Printing' : 'Create Account'} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <L