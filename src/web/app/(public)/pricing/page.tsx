'use client';

import { useQuery } from '@tanstack/react-query';
import { materialsApi, type Material } from '@/lib/api/materials';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check } from 'lucide-react';


export default function PricingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['materials-public'],
    queryFn: () => materialsApi.getAll(),
  });

  const materials = data?.data.filter((m) => m.isActive) ?? [];

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">Materials & Pricing</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Transparent<br />pricing.
          </h1>
          <p className="text-white/50 text-lg mt-4 max-w-xl">
            No hidden fees. Pricing is calculated by material weight — 
            upload your model to get an instant estimate.
          </p>
        </div>
      </section>

      {/* How pricing works */}
      <section className="py-16 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black mb-8">How pricing works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Upload your STL', desc: 'We analyze your model and calculate the estimated weight in grams.' },
              { step: '2', title: 'Choose your material', desc: 'Each material has a per-gram rate. Select quality, infill, and color.' },
              { step: '3', title: 'Get your price', desc: 'Price = weight × material rate × quality multiplier. Simple and fair.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-amber-400/50 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality multipliers */}
      <section className="py-16 px-6 border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black mb-2">Quality settings</h2>
          <p className="text-white/50 text-sm mb-8">Layer height affects detail and price.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Draft', layers: '0.3mm layers', multiplier: '×0.8', desc: 'Fast, functional' },
              { name: 'Standard', layers: '0.2mm layers', multiplier: '×1.0', desc: 'Balanced quality', highlight: true },
              { name: 'High', layers: '0.15mm layers', multiplier: '×1.3', desc: 'Fine detail' },
              { name: 'Ultra High', layers: '0.1mm layers', multiplier: '×1.6', desc: 'Maximum detail' },
            ].map((q) => (
              <div key={q.name}
                className={`border rounded-xl p-5 ${q.highlight ? 'border-amber-400/50 bg-amber-400/5' : 'border-white/10'}`}>
                <div className="text-2xl font-black text-amber-400 mb-1">{q.multiplier}</div>
                <div className="font-bold mb-0.5">{q.name}</div>
                <div className="text-white/40 text-xs mb-1">{q.layers}</div>
                <div className="text-white/50 text-xs">{q.desc}</div>
                {q.highlight && (
                  <div className="mt-2 text-amber-400 text-xs font-semibold">Most popular</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Materials */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black mb-2">Available materials</h2>
          <p className="text-white/50 text-sm mb-8">All prices per gram of material used.</p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse border border-white/10 rounded-xl p-6 h-48" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <div key={material.id}
                  className="border border-white/10 rounded-xl p-6 hover:border-amber-400/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{material.type} - {material.color}</h3>
                      {material.technology && (
                        <p className="text-white/30 text-xs">{material.technology.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-amber-400">
                        ${material.pricePerGram.toFixed(2)}
                      </div>
                      <div className="text-white/30 text-xs">per gram</div>
                    </div>
                  </div>

                  {material.description && (
                    <p className="text-white/50 text-sm leading-relaxed mb-4">
                      {material.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {material.finish && (
                      <span className="text-xs border border-white/10 rounded-full px-2.5 py-0.5 text-white/40">
                        Finish - {material.finish}
                      </span>
                    )}
                    {material.grade && (
                      <span className="text-xs border border-white/10 rounded-full px-2.5 py-0.5 text-white/40">
                        Grade - {material.grade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Ready to get a quote?</h2>
            <p className="text-white/50">Upload your model and get an instant estimate.</p>
          </div>
          <Button
            size="lg"
            className="bg-amber-400 text-black hover:bg-amber-300 font-bold px-10 h-12 shrink-0"
            asChild
          >
            <Link href="/register">Start Your Order</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}