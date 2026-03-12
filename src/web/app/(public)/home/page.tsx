'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, X } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';
import { materialsApi, type Material } from '@/lib/api/materials';
import { contentApi, type PortfolioItemResponse } from '@/lib/api/content';

// ─── Fonts ────────────────────────────────────────────────────────────────────
const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

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

function layerColor(i: number, total: number): string {
  const pct = i / total;
  if (pct > 0.88) {
    const t = (pct - 0.88) / 0.12;
    return `rgba(${Math.round(210 + t * 10)}, ${Math.round(225 + t * 10)}, 255, ${0.2 + t * 0.55})`;
  }
  if (pct > 0.52) {
    const t = (pct - 0.52) / 0.36;
    return `rgba(245, ${Math.round(140 + t * 18)}, 11, ${0.42 + t * 0.35})`;
  }
  const t = pct / 0.52;
  return `rgba(${Math.round(120 + t * 40)}, ${Math.round(55 + t * 30)}, 8, ${0.28 + t * 0.45})`;
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

// ─── Material type grouping ───────────────────────────────────────────────────
type MaterialGroup = {
  type:     string;
  variants: Material[];
  minPrice: number;
  maxPrice: number;
};

function groupMaterials(materials: Material[]): MaterialGroup[] {
  const map = new Map<string, Material[]>();
  for (const m of materials) {
    const existing = map.get(m.type) ?? [];
    map.set(m.type, [...existing, m]);
  }
  return Array.from(map.entries()).map(([type, variants]) => ({
    type,
    variants,
    minPrice: Math.min(...variants.map(v => v.pricePerGram)),
    maxPrice: Math.max(...variants.map(v => v.pricePerGram)),
  }));
}

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
      className="border border-white/12 p-5 text-left hover:border-amber-400/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
    >
      <div
        className="font-black text-xl tracking-tight mb-2 transition-colors group-hover:text-amber-400"
        style={{ fontFamily: 'var(--font-epilogue)' }}
      >
        {group.type}
      </div>
      <div className={`${mono.className} text-[8.5px] text-white/40 uppercase tracking-wide mb-1.5`}>
        {group.variants.length === 1
          ? '1 variant'
          : `${group.variants.length} variants`}
      </div>
      <div className={`${mono.className} text-[9px] text-amber-400/60`}>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-lg bg-[#0d0a06] border border-white/15 p-8 max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modalIn 0.18s ease-out both' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-amber-400/55 mb-2`}>
          Material
        </p>
        <h3 className="font-black text-4xl leading-[1.15] mb-1" style={{ fontFamily: 'var(--font-epilogue)' }}>
          {group.type}
        </h3>
        <p className={`${mono.className} text-[10px] text-white/35 uppercase tracking-[0.18em] mb-8`}>
          {group.variants.length} {group.variants.length === 1 ? 'variant' : 'variants'} available
        </p>

        {/* Variant list */}
        <div className="space-y-2 mb-8">
          {group.variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between border border-white/10 px-5 py-4 hover:border-white/20 transition-colors"
            >
              <div>
                <div className="font-semibold text-sm text-white/88" style={{ fontFamily: 'var(--font-epilogue)' }}>
                  {v.color}
                </div>
                <div className={`${mono.className} text-[8.5px] text-white/32 uppercase tracking-wide mt-0.5`}>
                  {[v.finish, v.grade].filter(Boolean).join(' · ') || 'Standard'}
                </div>
              </div>
              <div className={`${display.className} text-amber-400 text-2xl`}>
                ${v.pricePerGram.toFixed(3)}<span className={`${mono.className} text-[10px] text-white/28 font-normal ml-0.5`}>/g</span>
              </div>
            </div>
          ))}
        </div>

        {/* Description from first variant that has one */}
        {group.variants.find(v => v.description) && (
          <p className="text-white/55 text-sm leading-relaxed mb-8 border-l-2 border-amber-400/25 pl-4">
            {group.variants.find(v => v.description)!.description}
          </p>
        )}

        <Link
          href="/pricing"
          className={`${mono.className} w-full flex items-center justify-center gap-2 bg-amber-400 text-black text-[11px] uppercase tracking-[0.18em] font-semibold h-11 hover:bg-amber-300 transition-colors`}
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
  index,
  mono,
  display,
}: {
  item:    PortfolioItemResponse;
  index:   number;
  mono:    string;
  display: string;
}) {
  const [imgError, setImgError] = useState(false);
  const isAbsoluteUrl = item.imageUrl?.startsWith('http');

  return (
    <Link
      href={`/portfolio/${item.id}`}
      className="group bg-[#0d0a06] block hover:bg-white/[0.02] transition-colors"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#111]">
        {!imgError && isAbsoluteUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          // Graceful fallback — styled placeholder, not a broken image icon
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <div
              className={`${display} text-white/[0.06] select-none leading-none text-center px-4`}
              style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}
            >
              {item.category.toUpperCase()}
            </div>
            <div className={`${mono} text-[9px] uppercase tracking-[0.25em] text-amber-400/20 mt-3`}>
              Photo coming soon
            </div>
          </div>
        )}

        {/* Featured badge */}
        {item.isFeatured && (
          <div className={`${mono} absolute top-3 left-3 bg-amber-400 text-black text-[8px] uppercase tracking-[0.18em] font-semibold px-2 py-0.5`}>
            Featured
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>

      {/* Card body */}
      <div className="p-6 border-t border-white/8">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className={`${mono} text-[9px] uppercase tracking-[0.2em] text-amber-400/50`}>
            {item.category}
          </div>
          {item.material && (
            <div className={`${mono} text-[8.5px] uppercase tracking-[0.15em] text-white/22 shrink-0`}>
              {item.material.type} · {item.material.color}
            </div>
          )}
        </div>
        <h3 className="font-black text-base leading-snug mb-2 group-hover:text-amber-400 transition-colors"
          style={{ fontFamily: 'var(--font-epilogue)' }}>
          {item.title}
        </h3>
        <p className={`text-white/45 text-sm leading-relaxed line-clamp-2`}>
          {item.description}
        </p>
        <div className={`${mono} mt-4 text-[9px] uppercase tracking-[0.2em] text-white/22 flex items-center gap-1.5 group-hover:text-amber-400/60 transition-colors`}>
          View project <ArrowRight className="h-2.5 w-2.5" />
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [layerCount,      setLayerCount]      = useState(0);
  const [selectedGroup,   setSelectedGroup]   = useState<MaterialGroup | null>(null);

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
          0%, 100% { opacity: 0.35; }
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
        <section className="relative min-h-[100svh] flex flex-col bg-[#0d0a06] overflow-x-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '300px',
            }}
          />
          <div className="pointer-events-none absolute top-1/3 -left-48 w-[560px] h-[560px] rounded-full bg-amber-700/8 blur-[140px]" />

          <div className="relative flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-6">
            {/* Left — headline */}
            <div className="flex-1 flex flex-col justify-center py-14 md:py-24 pr-0 md:pr-16">
              <div className="fade-up flex items-center gap-2.5 mb-10" style={{ animationDelay: '0.05s' }}>
                <span className="dot-pulse w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-amber-400/60`}>
                  Northern Colorado · Est. 2024
                </span>
              </div>

              <div className="fade-up" style={{ animationDelay: '0.15s' }}>
                <h1
                  className={`${display.className} text-white leading-[0.88]`}
                  style={{ fontSize: 'clamp(5.5rem, 13vw, 9.5rem)' }}
                >
                  NOCO<br />
                  <span className="text-amber-400">MAKE</span><br />
                  LAB.
                </h1>
              </div>

              <div className="fade-up mt-8 mb-11" style={{ animationDelay: '0.3s' }}>
                <p className="text-white/60 text-[1.05rem] leading-relaxed max-w-[22rem]">
                  Precision 3D printing for engineers, designers, and
                  makers — right here in Northern Colorado.
                </p>
              </div>

              <div className="fade-up flex flex-wrap gap-3" style={{ animationDelay: '0.45s' }}>
                <Link
                  href="/register"
                  className={`${mono.className} inline-flex items-center gap-2.5 bg-amber-400 text-black text-[11px] font-semibold uppercase tracking-[0.18em] px-7 h-12 hover:bg-amber-300 transition-colors`}
                >
                  Start Printing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/portfolio"
                  className={`${mono.className} inline-flex items-center border border-white/18 text-white/62 text-[11px] uppercase tracking-[0.18em] px-7 h-12 hover:text-white hover:border-white/35 transition-colors`}
                >
                  View Our Work
                </Link>
              </div>
            </div>

            {/* Right — mountain print viz (stacks below headline on mobile) */}
            <div className="flex w-full md:w-[46%] items-end pt-0 pb-10 md:py-16 relative">
              <div className="relative w-full" style={{ height: 'min(38vw, 520px)', minHeight: '200px' }}>
                <div
                  className="absolute inset-0 opacity-[0.045]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }}
                />

                {/* Layer counter — bottom-right of viz, desktop only */}
                <div className={`${mono.className} hidden md:block absolute bottom-5 right-3 z-20 text-right leading-none`}>
                  <div className="text-[8px] uppercase tracking-[0.28em] text-white/14 mb-1">Layer</div>
                  <div className="tabular-nums font-semibold text-amber-400/85" style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)' }}>
                    {String(layerCount).padStart(3, '0')}
                    <span className="text-white/14"> / {LAYER_COUNT}</span>
                  </div>
                  <div className={`text-[8px] uppercase tracking-[0.2em] mt-1 transition-opacity duration-500 ${layerCount >= LAYER_COUNT ? 'text-amber-400/38 opacity-100' : 'opacity-0'}`}>
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
                    stroke="rgba(245,158,11,0.55)"
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
                      background: 'rgba(245,158,11,0.55)',
                      boxShadow:  '0 0 8px rgba(245,158,11,0.35)',
                    }}
                  />
                )}

                <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-400/18" />
                <div className="absolute bottom-0 left-0 top-0 w-px bg-white/5" />
                <div className="absolute bottom-0 left-1/4 right-1/4 h-24 bg-amber-600/5 blur-3xl pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4">
              {[
                { v: typeCount > 0 ? `${typeCount}` : '—', l: 'Material types' },
                { v: '0.1mm', l: 'Min layer height'   },
                { v: 'FDM',   l: 'Technology'         },
                { v: '~1 wk', l: 'Typical turnaround' },
              ].map(({ v, l }) => (
                <div key={l} className="py-5 px-5 border-r border-white/10 last:border-0 first:pl-0">
                  <div className={`${display.className} text-3xl text-amber-400`}>{v}</div>
                  <div className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/28 mt-0.5`}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ════════════════════════════ TICKER ════════════════════════════ */}
        <div className="bg-amber-400 overflow-hidden py-3.5 select-none">
          <div className="flex whitespace-nowrap ticker-run">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span
                key={i}
                className={`${mono.className} mx-8 text-[11px] uppercase tracking-[0.22em]
                  ${item.type === 'phrase' ? 'text-black font-semibold' : 'text-black/40'}`}
              >
                {item.text}
                <span className="ml-8 text-black/18">·</span>
              </span>
            ))}
          </div>
        </div>


        {/* ════════════════════════════ PORTFOLIO PREVIEW ════════════════════════════ */}
        <section className="py-36 px-6 bg-[#0d0a06] border-t border-white/10">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex items-end justify-between gap-8 mb-16">
              <div>
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
                  Our Work
                </p>
                <h2
                  className="font-black tracking-tight leading-[1.15]"
                  style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
                >
                  Built here.<br />Shipped real.
                </h2>
              </div>
              <Link
                href="/portfolio"
                className={`${mono.className} hidden md:inline-flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-[0.22em] hover:text-amber-400 transition-colors group shrink-0`}
              >
                View all work
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Cards */}
            {featuredItems.length === 0 ? (
              // Skeleton / empty state — 3 placeholder cards
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/8">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="bg-[#0d0a06]">
                    <div className="aspect-[4/3] bg-white/[0.03] animate-pulse" />
                    <div className="p-6 space-y-2">
                      <div className="h-2 w-16 bg-white/[0.06] animate-pulse" />
                      <div className="h-3 w-32 bg-white/[0.06] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/8">
                {featuredItems.map((item, i) => (
                  <PortfolioCard key={item.id} item={item} index={i} mono={mono.className} display={display.className} />
                ))}
              </div>
            )}

            {/* Mobile view-all link */}
            <div className="mt-10 md:hidden">
              <Link
                href="/portfolio"
                className={`${mono.className} inline-flex items-center gap-2 text-amber-400 text-[11px] uppercase tracking-[0.22em] group`}
              >
                View all work
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

          </div>
        </section>


        {/* ════════════════════════════ PROCESS ════════════════════════════ */}
        <section className="py-36 px-6 bg-[#0d0a06]">
          <div className="max-w-7xl mx-auto">

            <div className="flex items-end justify-between gap-8 mb-20">
              <div>
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
                  Process
                </p>
                <h2
                  className="font-black tracking-tight leading-[1.15]"
                  style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
                >
                  From file<br />to finished.
                </h2>
              </div>
              <p className="hidden md:block text-white/30 text-sm max-w-[9rem] text-right leading-relaxed">
                Four steps.<br />Zero complexity.
              </p>
            </div>

            {/* Side-by-side grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 border border-white/10">
              {PROCESS_STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className="relative p-8 border-b md:border-b-0 md:border-r border-white/10 last:border-0 hover:bg-white/[0.025] transition-colors group overflow-hidden"
                >
                  {/* Ghost step number */}
                  <div
                    className={`${display.className} absolute -bottom-2 -right-1 text-white/[0.04] pointer-events-none select-none leading-none`}
                    style={{ fontSize: '8rem' }}
                  >
                    {step.n}
                  </div>

                  <div className="relative">
                    {/* Animated underline on hover */}
                    <div className="w-6 h-0.5 bg-amber-400/35 mb-6 group-hover:w-14 group-hover:bg-amber-400 transition-all duration-300" />
                    <p className={`${mono.className} text-[10px] uppercase tracking-[0.22em] text-amber-400/55 mb-3`}>
                      {step.n}
                    </p>
                    <h3 className="font-black text-2xl mb-4 tracking-tight" style={{ fontFamily: 'var(--font-epilogue)' }}>
                      {step.title}
                    </h3>
                    <p className="text-white/58 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ════════════════════════════ MATERIALS ════════════════════════════ */}
        <section className="py-36 px-6 border-t border-white/10 bg-[#0b0907]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 items-start">

              {/* Copy */}
              <div className="lg:col-span-2">
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
                  Materials
                </p>
                <h2
                  className="font-black tracking-tight leading-[1.15] mb-5"
                  style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
                >
                  Right tool.<br />Right material.
                </h2>
                <p className="text-white/60 leading-relaxed text-sm mb-10 max-w-xs">
                  From flexible TPU to engineering-grade Nylon — stocked for
                  what professional work demands. Priced per gram, no surprises.
                </p>
                <Link
                  href="/pricing"
                  className={`${mono.className} inline-flex items-center gap-2 text-amber-400 text-[11px] uppercase tracking-[0.22em] group`}
                >
                  Full pricing list
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Type tiles — grouped, one per material type */}
              <div className="lg:col-span-3">
                {materialGroups.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className="h-[4.5rem] bg-white/[0.03] animate-pulse" />
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
                <p className={`${mono.className} text-[8.5px] text-white/20 uppercase tracking-[0.2em] mt-4`}>
                  Tap any type for colors &amp; pricing ↗
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* ════════════════════════════ WHY NOCO ════════════════════════════ */}
        <section className="py-36 px-6 border-t border-white/10 bg-[#0d0a06]">
          <div className="max-w-7xl mx-auto">
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
              Why NoCo Make Lab
            </p>
            <h2
              className="font-black tracking-tight leading-[1.15] mb-20"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
            >
              Local shop.<br />Pro results.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
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
                <div key={c.tag} className="bg-[#0d0a06] p-10 hover:bg-white/[0.02] transition-colors">
                  <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-amber-400/45 mb-6`}>
                    {c.tag}
                  </p>
                  <h3 className="font-black text-xl leading-snug mb-4" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {c.title}
                  </h3>
                  <p className="text-white/58 text-sm leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
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
          <div className="relative max-w-7xl mx-auto px-6 py-36 md:py-44">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-14">
              <div>
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-black/32 mb-6`}>
                  Get Started
                </p>
                <h2
                  className={`${display.className} text-black leading-[0.88]`}
                  style={{ fontSize: 'clamp(4.5rem, 12vw, 8.5rem)' }}
                >
                  READY<br />TO PRINT?
                </h2>
              </div>
              <div className="flex flex-col items-start md:items-end gap-5">
                <p className="hidden md:block text-black/50 text-sm max-w-xs text-right leading-relaxed">
                  Upload your file, configure your print, and get an estimate in minutes.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className={`${mono.className} inline-flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-zinc-900 transition-colors`}
                  >
                    Create Account <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/contact"
                    className={`${mono.className} inline-flex items-center border border-black/20 text-black text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-black/5 transition-colors`}
                  >
                    Talk to Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}