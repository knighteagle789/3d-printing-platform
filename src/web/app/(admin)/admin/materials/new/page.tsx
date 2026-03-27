'use client';

import { mono } from '@/lib/fonts';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi, type MaterialFinish, type MaterialGrade } from '@/lib/api/materials';
import { MaterialForm, type MaterialFormValues } from '../_components/material-form';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';


export default function NewMaterialPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const mutation = useMutation({
    mutationFn: (values: MaterialFormValues) =>
      materialsApi.create({
        type:                   values.type,
        color:                  values.color,
        finish:                 values.finish as MaterialFinish | undefined || undefined,
        grade:                  values.grade as MaterialGrade | undefined || undefined,
        description:            values.description || undefined,
        brand:                  values.brand || undefined,
        pricePerGram:           values.pricePerGram,
        stockGrams:             values.stockGrams,
        lowStockThresholdGrams: values.lowStockThresholdGrams,
        notes:                  values.notes || undefined,
        printSettings:          values.printSettings || undefined,
        printingTechnologyId:   values.printingTechnologyId || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      showToast(`${res.data.type} — ${res.data.color} created.`, true);
      setTimeout(() => router.push('/admin/materials'), 800);
    },
    onError: () => showToast('Failed to create material.', false),
  });

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Toast */}
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

      {/* Back */}
      <button
        onClick={() => router.push('/admin/materials')}
        className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-text-primary transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Back to Materials
      </button>

      {/* Header */}
      <h1
        className="font-black tracking-tight leading-[1.1] text-text-primary"
        style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
      >
        New Material
      </h1>

      {/* Form */}
      <div className="border border-border p-6">
        <MaterialForm
          onSubmit={(values) => mutation.mutate(values)}
          isSubmitting={mutation.isPending}
          submitLabel="Create Material"
        />
      </div>

    </div>
  );
}