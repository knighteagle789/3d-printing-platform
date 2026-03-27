'use client';

import { display, mono } from '@/lib/fonts';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { materialsApi, type Material } from '@/lib/api/materials';
import { groupMaterials, type MaterialGroup } from '@/lib/utils';


const QUALITY_TIERS = [
  { name: 'Draft',      layer: '0.3mm',  multiplier: '×0.8', desc: 'Fast. Functional. Good for form-fit tests.',        highlight: false },
  { name: 'Standard',   layer: '0.2mm',  multiplier: '×1.0', desc: 'The default. Right balance of speed and quality.',  highlight: true  },
  { name: 'High',       layer: '0.15mm', multiplier: '×1.3', desc: 'Finer detail. Smoother surfaces.',                  highlight: false },
  { name: 'Ultra High', layer: '0.1mm',  multiplier: '×1.6', desc: 'Maximum resolution. Best for display pieces.',      highlight: false },
];

const HOW_STEPS = [
  { n: '01', title: 'Upload your model',  desc: 'STL, OBJ, or 3MF up to 200MB. We calculate the estimated print weight in grams from your geometry.' },
  { n: '02', title: 'Choose material',    desc: 'Pick type, color, and finish. Each variant has its own per-gram rate — you see the full cost before you commit.' },
  { n: '03', title: 'Set quality',        desc: 'Layer height determines detail and speed. A multiplier is applied to the base material rate.' },
];

export default function PricingPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['materials-public'],
    queryFn:  () => materialsApi.getAll(),
  });

  const materials      = data?.data.filter(m => m.isActive) ?? [];
  const materialGroups = groupMaterials(materials);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (type: string) =>
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

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
        <div className="max-w-7xl mx-auto">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-accent/70 mb-6`}>
            Materials &amp; Pricing
          </p>
          <h1
            className={`${display.className} text-text-primary leading-[0.88] mb-8`}
            style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
          >
            TRANSPARENT<br />
            <span className="text-accent">PRICING.</span>
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed max-w-xl">
            No setup fees. No hidden charges. Price is weight × material rate × quality
            multiplier — calculated from your file before you place the order.
          </p>
        </div>
      </section>


      {/* ════════════════════════════ HOW IT WORKS ════════════════════════════ */}
      <section className="py-28 px-6 border-b border-border bg-surface-alt">
        <div className="max-w-7xl mx-auto">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
            How it works
          </p>
          <h2
            className="font-black tracking-tight leading-[1.15] mb-16 text-text-primary"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}
          >
            Simple formula.<br />Zero surprises.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {HOW_STEPS.map((step) => (
              <div key={step.n} className="relative bg-surface p-8 group hover:bg-accent-light transition-colors overflow-hidden">
                <div
                  className={`${display.className} absolute -bottom-2 -right-1 text-text-primary/[0.04] pointer-events-none select-none leading-none`}
                  style={{ fontSize: '8rem' }}
                >
                  {step.n}
                </div>
                <div className="relative">
                  <div className="w-6 h-0.5 bg-accent/30 mb-6 group-hover:w-14 group-hover:bg-accent transition-all duration-300" />
                  <p className={`${mono.className} text-[10px] uppercase tracking-[0.22em] text-accent/55 mb-3`}>
                    {step.n}
                  </p>
                  <h3 className="font-black text-xl mb-4 tracking-tight text-text-primary" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Formula callout */}
          <div className="mt-8 border border-border bg-surface p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-text-muted shrink-0`}>
              Formula
            </p>
            <div className={`${display.className} text-accent text-2xl sm:text-3xl tracking-wide`}>
              WEIGHT (g) × MATERIAL RATE × QUALITY MULTIPLIER
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════ QUALITY ════════════════════════════ */}
      <section className="py-28 px-6 border-b border-border bg-page">
        <div className="max-w-7xl mx-auto">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
            Quality settings
          </p>
          <h2
            className="font-black tracking-tight leading-[1.15] mb-16 text-text-primary"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}
          >
            Layer height.<br />Your call.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {QUALITY_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative p-8 transition-colors ${
                  tier.highlight
                    ? 'bg-accent-light border-t-2 border-t-accent'
                    : 'bg-surface hover:bg-surface-alt'
                }`}
              >
                {tier.highlight && (
                  <p className={`${mono.className} text-[8.5px] uppercase tracking-[0.2em] text-accent mb-3`}>
                    Most popular
                  </p>
                )}
                <div className={`${display.className} text-4xl mb-1 ${tier.highlight ? 'text-accent' : 'text-text-secondary'}`}>
                  {tier.multiplier}
                </div>
                <h3 className="font-black text-lg mb-1 text-text-primary" style={{ fontFamily: 'var(--font-epilogue)' }}>
                  {tier.name}
                </h3>
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] mb-4 ${tier.highlight ? 'text-accent/70' : 'text-text-muted'}`}>
                  {tier.layer} layers
                </p>
                <p className="text-text-secondary text-sm leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════ MATERIALS ════════════════════════════ */}
      <section className="py-28 px-6 border-b border-border bg-surface-alt">
        <div className="max-w-7xl mx-auto">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent/70 mb-5`}>
            Available materials
          </p>
          <h2
            className="font-black tracking-tight leading-[1.15] mb-4 text-text-primary"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}
          >
            Every variant.<br />Every price.
          </h2>
          <p className="text-text-secondary text-sm mb-16 max-w-lg leading-relaxed">
            Prices are per gram of material used in your print. Prices shown are base rates
            before the quality multiplier is applied.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-14 bg-surface animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="border border-border bg-surface px-6 py-12 text-center">
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-text-muted mb-2`}>
                Unable to load
              </p>
              <p className="text-text-secondary text-sm">
                Material pricing couldn&apos;t be loaded right now. Please try refreshing the page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {materialGroups.map((group) => {
                const descriptionVariant = group.variants.find(v => v.description);
                const priceLabel = group.minPrice === group.maxPrice
                  ? `$${group.minPrice.toFixed(3)}/g`
                  : `$${group.minPrice.toFixed(3)} – $${group.maxPrice.toFixed(3)}/g`;
                return (
                  <div key={group.type}>
                    <button
                      onClick={() => toggleGroup(group.type)}
                      className="w-full flex items-center gap-4 px-5 py-4 border border-border bg-surface hover:bg-accent-light transition-colors group"
                      style={{ borderBottom: openGroups.has(group.type) ? '1px solid var(--color-border)' : undefined }}
                    >
                      <h3
                        className="font-black text-xl tracking-tight text-text-primary group-hover:text-accent transition-colors"
                        style={{ fontFamily: 'var(--font-epilogue)' }}
                      >
                        {group.type}
                      </h3>
                      <span className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
                        {group.variants.length === 1 ? '1 variant' : `${group.variants.length} variants`}
                      </span>
                      <span className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-accent/70 ml-auto mr-3`}>
                        {priceLabel}
                      </span>
                      {openGroups.has(group.type)
                        ? <ChevronUp  className="h-4 w-4 text-accent shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-text-muted shrink-0 group-hover:text-text-secondary transition-colors" />
                      }
                    </button>

                    {openGroups.has(group.type) && (
                      <div className="border border-t-0 border-border bg-surface">
                        <div className="grid grid-cols-12 border-b border-border px-5 py-2">
                          {['Color', 'Finish', 'Grade', 'Price / gram'].map((col, i) => (
                            <div
                              key={col}
                              className={`${mono.className} text-[8.5px] uppercase tracking-[0.2em] text-text-muted ${
                                i === 0 ? 'col-span-4' : i === 3 ? 'col-span-4 text-right' : 'col-span-2 hidden sm:block'
                              }`}
                            >
                              {col}
                            </div>
                          ))}
                        </div>

                        {group.variants.map((v, i) => (
                          <div
                            key={v.id}
                            className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-surface-alt transition-colors ${
                              i < group.variants.length - 1 ? 'border-b border-border' : ''
                            }`}
                          >
                            <div className="col-span-4">
                              <span className="font-medium text-sm text-text-primary">{v.color}</span>
                              {v.technology && (
                                <span className={`${mono.className} text-[8.5px] uppercase tracking-[0.15em] text-text-muted ml-3`}>
                                  {v.technology.name}
                                </span>
                              )}
                            </div>
                            <div className={`${mono.className} col-span-2 text-[10px] uppercase tracking-[0.15em] text-text-secondary hidden sm:block`}>
                              {v.finish ?? '—'}
                            </div>
                            <div className={`${mono.className} col-span-2 text-[10px] uppercase tracking-[0.15em] text-text-secondary hidden sm:block`}>
                              {v.grade ?? '—'}
                            </div>
                            <div className="col-span-8 sm:col-span-4 text-right">
                              <span className={`${display.className} text-accent text-2xl`}>
                                ${v.pricePerGram.toFixed(3)}
                              </span>
                              <span className={`${mono.className} text-[9px] text-text-muted ml-1`}>/g</span>
                            </div>
                          </div>
                        ))}

                        {descriptionVariant && (
                          <div className="px-5 py-3 border-t border-border bg-surface-alt">
                            <p className="text-text-secondary text-xs leading-relaxed">
                              {descriptionVariant.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
              Get started
            </p>
            <h2
              className={`${display.className} text-white leading-[0.88]`}
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}
            >
              READY TO<br />GET A QUOTE?
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="hidden md:block text-white/60 text-sm max-w-xs text-right leading-relaxed">
              Upload your file and get a full estimate before you commit to anything.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-white text-accent text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-white/90 transition-colors`}
              >
                Start Your Order <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/contact"
                className={`${mono.className} inline-flex items-center border border-white/30 text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-white/10 transition-colors`}
              >
                Ask a Question
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}