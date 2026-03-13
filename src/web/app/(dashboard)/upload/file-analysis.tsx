import { UploadedFile } from '@/lib/api/files';
import { CheckCircle, AlertTriangle, Clock, Layers } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ weight: ['400', '500', '600'], subsets: ['latin'] });

interface FileAnalysisProps {
  file: UploadedFile;
}

function StatCell({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="px-4 py-3 border-b border-r border-white/[0.06] last:border-r-0">
      <p className={`${mono.className} text-[8px] uppercase tracking-[0.18em] text-white/20 mb-1`}>
        {label}
      </p>
      <p className={`${mono.className} text-[12px] text-white/70`}>
        {value}
      </p>
    </div>
  );
}

export function FileAnalysisPanel({ file }: FileAnalysisProps) {
  const a = file.analysis;

  return (
    <div className="border border-white/[0.08]" style={{ background: '#080705' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/30`}>
          File Analysis
        </span>
        {a ? (
          <span className={`${mono.className} flex items-center gap-1.5 text-[9px] text-emerald-400/70`}>
            <CheckCircle className="h-3 w-3" />
            Analyzed
          </span>
        ) : (
          <span className={`${mono.className} flex items-center gap-1.5 text-[9px] text-white/20 animate-pulse`}>
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )}
      </div>

      {!a ? (
        <p className={`${mono.className} text-[10px] text-white/25 p-4`}>
          Analysis will be available shortly after upload.
        </p>
      ) : (
        <>
          {/* Dimensions banner */}
          {a.dimensionX && a.dimensionY && a.dimensionZ && (
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-white/20 shrink-0" />
              <span className={`${mono.className} text-[11px] text-white/50`}>
                {a.dimensionX.toFixed(1)} × {a.dimensionY.toFixed(1)} × {a.dimensionZ.toFixed(1)}{' '}
                <span className="text-white/20">mm</span>
              </span>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 border-b border-white/[0.06]">
            <StatCell
              label="Volume"
              value={a.volumeInCubicMm ? `${a.volumeInCubicMm.toFixed(2)} mm³` : null}
            />
            <StatCell
              label="Est. Weight"
              value={a.estimatedWeightGrams ? `${a.estimatedWeightGrams.toFixed(1)} g` : null}
            />
            <StatCell
              label="Est. Print Time"
              value={a.estimatedPrintTimeHours ? `${a.estimatedPrintTimeHours.toFixed(1)} hrs` : null}
            />
            <StatCell
              label="Triangles"
              value={a.triangleCount != null ? a.triangleCount.toLocaleString() : null}
            />
            <StatCell
              label="Complexity"
              value={a.complexityScore != null ? `${a.complexityScore} / 100` : null}
            />
          </div>

          {/* Flags */}
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {a.isManifold === true && (
              <span className={`${mono.className} text-[9px] text-emerald-400/60 border border-emerald-400/20 px-2 py-0.5`}>
                Manifold ✓
              </span>
            )}
            {a.isManifold === false && (
              <span className={`${mono.className} text-[9px] text-red-400/70 border border-red-400/20 px-2 py-0.5`}>
                Non-manifold
              </span>
            )}
            {a.requiresSupport && (
              <span className={`${mono.className} flex items-center gap-1 text-[9px] text-amber-400/60 border border-amber-400/20 px-2 py-0.5`}>
                <AlertTriangle className="h-2.5 w-2.5" />
                Requires supports
              </span>
            )}
          </div>

          {/* Warnings */}
          {a.warnings && (() => {
            try {
              const parsed: string[] = JSON.parse(a.warnings);
              return parsed.length > 0 ? (
                <div className="px-4 pb-3 space-y-1">
                  {parsed.map((w, i) => (
                    <p key={i} className={`${mono.className} text-[9px] text-amber-400/60 border border-amber-400/10 bg-amber-400/[0.03] px-3 py-2`}>
                      {w}
                    </p>
                  ))}
                </div>
              ) : null;
            } catch {
              return (
                <p className={`${mono.className} text-[9px] text-amber-400/60 border border-amber-400/10 bg-amber-400/[0.03] mx-4 mb-3 px-3 py-2`}>
                  {a.warnings}
                </p>
              );
            }
          })()}
        </>
      )}
    </div>
  );
}