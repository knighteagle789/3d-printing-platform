'use client';

import { JetBrains_Mono } from 'next/font/google';
import type { PricingConfig } from '@/lib/api/pricing';

const mono = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

interface PriceEstimatePanelProps {
  weightGrams:    number | null | undefined;
  pricePerGram:   number | null | undefined;
  quality:        string;
  quantity:       number;
  pricingConfig:  PricingConfig | null | undefined;
}

export function PriceEstimatePanel({
  weightGrams,
  pricePerGram,
  quality,
  quantity,
  pricingConfig,
}: PriceEstimatePanelProps) {
  const hasWeight   = weightGrams != null && weightGrams > 0;
  const hasMaterial = pricePerGram != null && pricePerGram > 0;
  const hasConfig   = pricingConfig != null;

  // Resolved values
  const multiplier  = pricingConfig?.qualityMultipliers[quality] ?? 1.0;
  const handlingFee = pricingConfig?.handlingFeePerModel ?? 0;

  const materialCost = hasWeight && hasMaterial
    ? weightGrams! * pricePerGram! * multiplier * quantity
    : null;

  const totalEstimate = materialCost != null
    ? materialCost + handlingFee
    : null;

  return (
    <div className="border border-border bg-surface">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
          Price Estimate
        </span>
        <span className={`${mono.className} text-[8.5px] uppercase tracking-[0.15em] text-text-muted/60`}>
          Before final review
        </span>
      </div>

      <div className="p-4 space-y-2">

        {/* Weight not available */}
        {!hasWeight && (
          <p className={`${mono.className} text-[10px] text-text-muted`}>
            {hasConfig
              ? 'Upload a file to see a price estimate.'
              : 'Loading pricing…'}
          </p>
        )}

        {/* Material not selected */}
        {hasWeight && !hasMaterial && (
          <p className={`${mono.className} text-[10px] text-text-muted`}>
            Select a material to see a price estimate.
          </p>
        )}

        {/* Full estimate */}
        {hasWeight && hasMaterial && (
          <>
            {/* Line items */}
            <div className="space-y-1.5">

              {/* Material cost */}
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className={`${mono.className} text-[10px] text-text-secondary`}>
                    Material
                  </span>
                  <span className={`${mono.className} text-[8.5px] text-text-muted ml-2`}>
                    {weightGrams!.toFixed(1)}g × ${pricePerGram!.toFixed(3)}/g × {multiplier}× × {quantity}
                  </span>
                </div>
                <span className={`${mono.className} text-[11px] text-text-primary tabular-nums shrink-0`}>
                  ${materialCost!.toFixed(2)}
                </span>
              </div>

              {/* Handling fee */}
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className={`${mono.className} text-[10px] text-text-secondary`}>
                    Handling
                  </span>
                  <span className={`${mono.className} text-[8.5px] text-text-muted ml-2`}>
                    setup, print start & QC
                  </span>
                </div>
                <span className={`${mono.className} text-[11px] text-text-primary tabular-nums shrink-0`}>
                  ${handlingFee.toFixed(2)}
                </span>
              </div>

            </div>

            {/* Divider */}
            <div className="border-t border-border pt-2 flex items-baseline justify-between">
              <span className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-text-muted`}>
                Estimated total
              </span>
              <span className={`${mono.className} text-lg font-semibold text-accent tabular-nums`}>
                ${totalEstimate!.toFixed(2)}
              </span>
            </div>

            {/* Disclaimer */}
            <p className={`${mono.className} text-[8px] text-text-muted/60 pt-0.5`}>
              Final price confirmed at order review. Weight is estimated from geometry.
            </p>
          </>
        )}
      </div>
    </div>
  );
}