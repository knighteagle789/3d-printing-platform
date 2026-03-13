'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi, type MaterialFinish, type MaterialGrade } from '@/lib/api/materials';
import { MaterialForm, type MaterialFormValues } from '../_components/material-form';
import { JetBrains_Mono } from 'next/font/google';
import {
  ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle,
  Package, Clock,
} from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

function gramsDisplay(value: number) {
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} kg`
    : `${value} g`;
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }      = use(params);
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'material', id],
    queryFn: () => materialsApi.getByIdAdmin(id),
  });

  const updateMutation = useMutation({
    mutationFn: (values: MaterialFormValues) =>
      materialsApi.update(id, {
        type:                   values.type,
        color:                  values.color,
        finish:                 values.finish as MaterialFinish || undefined,
        grade:                  values.grade as MaterialGrade || undefined,
        description:            values.description || undefined,
        brand:                  values.brand || undefined,
        pricePerGram:           values.pricePerGram,
        stockGrams:             values.stockGrams,
        lowStockThresholdGrams: values.lowStockThresholdGrams,
        notes:                  values.notes || undefined,
        printSettings:          values.printSettings || undefined,
        printingTechnologyId:   values.printingTechnologyId || undefined,
        isActive:               values.isActive,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'material', id] });
      showToast(`${res.data.type} — ${res.data.color} saved.`, true);
    },
    onError: () => showToast('Failed to save changes.', false),
  });

  const deleteMutation = useMutation({
    mutationFn: () => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      showToast('Material deactivated.', true);
      setTimeout(() => router.push('/admin/materials'), 800);
    },
    onError: () => showToast('Failed to deactivate material.', false),
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-5 bg-white/[0.05] animate-pulse w-28" />
        <div className="h-20 bg-white/[0.04] animate-pulse" />
        <div className="h-96 bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  const material = data?.data;
  if (!material) return null;

  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 4, maximumFractionDigits: 4,
  });

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 border ${
          toast.ok
            ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
            : 'bg-red-400/10 border-red-400/30 text-red-400'
        }`}>
          {toast.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle  className="h-4 w-4 shrink-0" />}
          <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
            {toast.msg}
          </span>
        </div>
      )}

      {/* ── Back ── */}
      <button
        onClick={() => router.push('/admin/materials')}
        className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/25 hover:text-white transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Back to Materials
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black tracking-tight leading-[1.1] text-white mb-2"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            {material.type} — {material.color}
          </h1>
          <div className={`${mono.className} flex items-center flex-wrap gap-3 text-[9px] uppercase tracking-[0.15em]`}>
            {material.brand && (
              <span className="text-white/30">{material.brand}</span>
            )}
            {material.finish && (
              <>
                <span className="text-white/12">·</span>
                <span className="text-white/25">{material.finish}</span>
              </>
            )}
            {material.grade && (
              <>
                <span className="text-white/12">·</span>
                <span className="text-white/25">{material.grade}</span>
              </>
            )}
            <span className="text-white/12">·</span>
            <span className={material.isActive ? 'text-emerald-400' : 'text-red-400'}>
              {material.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Deactivate */}
        {material.isActive && (
          confirmDeactivate ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className={`${mono.className} text-[9px] uppercase tracking-[0.12em] text-white/30`}>
                Are you sure?
              </span>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-3 h-8 border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30`}
              >
                {deleteMutation.isPending ? 'Deactivating...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDeactivate(false)}
                className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-3 h-8 border border-white/10 text-white/30 hover:text-white transition-colors`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeactivate(true)}
              className={`${mono.className} shrink-0 text-[9px] uppercase tracking-[0.15em] px-3 h-8 border border-white/10 text-white/25 hover:border-red-400/40 hover:text-red-400 transition-colors`}
            >
              Deactivate
            </button>
          )
        )}
      </div>

      {/* ── Low stock banner ── */}
      {material.isLowStock && material.isActive && (
        <div className="flex items-center gap-3 px-5 py-3.5 border border-amber-400/30 bg-amber-400/[0.05]">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-amber-400`}>
            Low stock — {gramsDisplay(material.stockGrams)} remaining
            {material.lowStockThresholdGrams && ` (threshold: ${gramsDisplay(material.lowStockThresholdGrams)})`}
          </p>
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-px bg-white/8">
        {[
          { icon: Package,  label: 'Stock',      value: gramsDisplay(material.stockGrams) },
          { icon: Package,  label: 'Price / g',  value: usd.format(material.pricePerGram) },
          { icon: Clock,    label: 'Updated',    value: material.updatedAt ? formatDateTime(material.updatedAt) : formatDateTime(material.createdAt) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#0d0a06] px-5 py-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="h-3 w-3 text-white/15" />
              <p className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-white/20`}>{label}</p>
            </div>
            <p className={`${mono.className} text-[13px] text-white/70`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Form ── */}
      <div className="border border-white/8 p-6">
        <MaterialForm
          defaultValues={{
            type:                   material.type,
            color:                  material.color,
            finish:                 material.finish ?? undefined,
            grade:                  material.grade ?? undefined,
            description:            material.description ?? '',
            brand:                  material.brand ?? '',
            pricePerGram:           material.pricePerGram,
            stockGrams:             material.stockGrams,
            lowStockThresholdGrams: material.lowStockThresholdGrams ?? undefined,
            notes:                  material.notes ?? '',
            printSettings:          material.printSettings ?? '',
            printingTechnologyId:   material.technology?.id ?? '',
            isActive:               material.isActive,
          }}
          onSubmit={(values) => updateMutation.mutate(values)}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      </div>

    </div>
  );
}