'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { materialsApi } from '@/lib/api/materials';
import { JetBrains_Mono } from 'next/font/google';
import { Plus, AlertTriangle, Package } from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function gramsDisplay(value: number) {
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} kg`
    : `${value} g`;
}

type FilterType = 'all' | 'active' | 'inactive' | 'low-stock';

export default function AdminMaterialsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'materials'],
    queryFn: () => materialsApi.getAllAdmin(),
  });

  const all = data?.data ?? [];

  // Counts for filter tabs
  const counts = {
    all:       all.length,
    active:    all.filter(m => m.isActive).length,
    inactive:  all.filter(m => !m.isActive).length,
    'low-stock': all.filter(m => m.isLowStock && m.isActive).length,
  };

  const filtered = all
    .filter(m => {
      if (filter === 'active')    return m.isActive;
      if (filter === 'inactive')  return !m.isActive;
      if (filter === 'low-stock') return m.isLowStock && m.isActive;
      return true;
    })
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.type.toLowerCase().includes(q) ||
        m.color.toLowerCase().includes(q) ||
        (m.brand ?? '').toLowerCase().includes(q) ||
        (m.technology?.name ?? '').toLowerCase().includes(q)
      );
    });

  const TABS: { key: FilterType; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'active',    label: 'Active' },
    { key: 'inactive',  label: 'Inactive' },
    { key: 'low-stock', label: 'Low Stock' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black tracking-tight leading-[1.1] text-white mb-1.5"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Materials
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/25`}>
            {counts.all} total · {counts.active} active · {counts['low-stock']} low stock
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/materials/new')}
          className={`${mono.className} inline-flex items-center gap-2 bg-amber-400 text-black text-[10px] uppercase tracking-[0.18em] font-semibold px-5 h-9 hover:bg-amber-300 transition-colors shrink-0`}
        >
          <Plus className="h-3.5 w-3.5" /> New Material
        </button>
      </div>

      {/* ── Filter tabs + search ── */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-0">
        <div className="flex items-end gap-0">
          {TABS.map(({ key, label }) => {
            const isActive = filter === key;
            const isLowStock = key === 'low-stock' && counts['low-stock'] > 0;
            return (
              <button
                key={key}
                onClick={() => { setFilter(key); setSearch(''); }}
                className={`${mono.className} relative flex items-center gap-1.5 px-4 py-3 text-[9px] uppercase tracking-[0.18em] transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-amber-400 border-amber-400'
                    : 'text-white/30 border-transparent hover:text-white/50'
                }`}
              >
                {label}
                <span className={`text-[8px] px-1 py-0.5 ${
                  isActive
                    ? isLowStock ? 'bg-red-400/20 text-red-400' : 'bg-amber-400/15 text-amber-400'
                    : isLowStock ? 'bg-red-400/10 text-red-400/60' : 'bg-white/[0.06] text-white/25'
                }`}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search type, color, brand..."
          className={`${mono.className} h-8 bg-white/[0.03] border border-white/8 px-3 text-[10px] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors w-56`}
        />
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="space-y-px">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package className="h-8 w-8 text-white/10" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.2em] text-white/20`}>
            {search ? 'No materials match your search' : 'No materials found'}
          </p>
          {!search && (
            <button
              onClick={() => router.push('/admin/materials/new')}
              className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-amber-400 hover:text-amber-300 transition-colors mt-1`}
            >
              Add your first material →
            </button>
          )}
        </div>
      ) : (
        <div className="border border-white/8">
          {/* Table header */}
          <div className={`${mono.className} grid text-[8px] uppercase tracking-[0.18em] text-white/20 border-b border-white/8 bg-white/[0.02]`}
            style={{ gridTemplateColumns: '1fr 1fr 80px 80px 100px 100px 120px 80px' }}
          >
            {['Type', 'Color', 'Finish', 'Grade', 'Price/g', 'Stock', 'Technology', 'Status'].map(h => (
              <div key={h} className="px-4 py-2.5">{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => router.push(`/admin/materials/${m.id}`)}
                className={`grid cursor-pointer transition-colors hover:bg-white/[0.03] ${
                  !m.isActive ? 'opacity-40' : ''
                }`}
                style={{ gridTemplateColumns: '1fr 1fr 80px 80px 100px 100px 120px 80px' }}
              >
                <div className={`${mono.className} px-4 py-3.5 text-[11px] text-white/80 font-semibold`}>
                  {m.type}
                </div>
                <div className={`${mono.className} px-4 py-3.5 text-[11px] text-white/60`}>
                  {m.color}
                </div>
                <div className={`${mono.className} px-4 py-3.5 text-[10px] text-white/35`}>
                  {m.finish ?? '—'}
                </div>
                <div className={`${mono.className} px-4 py-3.5 text-[10px] text-white/35`}>
                  {m.grade ?? '—'}
                </div>
                <div className={`${mono.className} px-4 py-3.5 text-[10px] text-white/60`}>
                  {usd.format(m.pricePerGram)}
                </div>
                <div className={`${mono.className} px-4 py-3.5 text-[10px] flex items-center gap-1.5`}>
                  {m.isLowStock ? (
                    <>
                      <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="text-amber-400">{gramsDisplay(m.stockGrams)}</span>
                    </>
                  ) : (
                    <span className="text-white/60">{gramsDisplay(m.stockGrams)}</span>
                  )}
                </div>
                <div className={`${mono.className} px-4 py-3.5 text-[10px] text-white/35`}>
                  {m.technology?.name ?? '—'}
                </div>
                <div className="px-4 py-3.5">
                  <span className={`${mono.className} inline-block text-[8px] uppercase tracking-[0.12em] px-2 py-0.5 border ${
                    m.isActive
                      ? 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20'
                      : 'text-white/20 bg-white/[0.03] border-white/8'
                  }`}>
                    {m.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}