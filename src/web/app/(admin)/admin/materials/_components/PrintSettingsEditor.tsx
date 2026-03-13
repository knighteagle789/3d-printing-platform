'use client';

import { Plus, X } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

export type PrintSettingPair = { key: string; value: string };

interface Props {
  pairs:    PrintSettingPair[];
  onChange: (pairs: PrintSettingPair[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deserialise a stored JSON string back to key-value pairs. Returns [] on failure. */
export function parsePrintSettings(raw: string | null | undefined): PrintSettingPair[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  } catch {
    return [];
  }
}

/** Serialise pairs to a JSON string for the API, filtering blank keys. */
export function serialisePrintSettings(pairs: PrintSettingPair[]): string | undefined {
  const entries = pairs.filter(p => p.key.trim());
  if (entries.length === 0) return undefined;
  return JSON.stringify(
    Object.fromEntries(
      entries.map(p => {
        const val = p.value.trim();
        // Coerce numeric-looking values to numbers
        const num = Number(val);
        return [p.key.trim(), val !== '' && !isNaN(num) ? num : val];
      })
    )
  );
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'bedTemp', 'hotendTemp', 'printSpeed', 'travelSpeed',
  'layerHeight', 'infill', 'wallThickness', 'supportEnabled',
  'coolingFanSpeed', 'retraction', 'retractionDistance',
  'uvWavelength', 'exposureTime', 'liftSpeed',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PrintSettingsEditor({ pairs, onChange }: Props) {
  const addPair    = () => onChange([...pairs, { key: '', value: '' }]);
  const removePair = (i: number) => onChange(pairs.filter((_, idx) => idx !== i));
  const updatePair = (i: number, field: 'key' | 'value', val: string) =>
    onChange(pairs.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const inputCls = `${mono.className} w-full h-8 bg-surface-alt border border-border px-2.5 text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`;

  return (
    <div className="space-y-2">
      {/* Header row */}
      {pairs.length > 0 && (
        <div className="grid gap-2 pr-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <p className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-text-muted px-0.5`}>Key</p>
          <p className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-text-muted px-0.5`}>Value</p>
        </div>
      )}

      {/* Pairs */}
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="grid gap-2 flex-1" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <input
              type="text"
              value={pair.key}
              onChange={e => updatePair(i, 'key', e.target.value)}
              placeholder="e.g. bedTemp"
              list="print-setting-keys"
              className={inputCls}
            />
            <input
              type="text"
              value={pair.value}
              onChange={e => updatePair(i, 'value', e.target.value)}
              placeholder="e.g. 60"
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={() => removePair(i)}
            className="shrink-0 text-text-muted hover:text-red-400 transition-colors p-1"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Suggestions datalist */}
      <datalist id="print-setting-keys">
        {SUGGESTIONS.map(s => <option key={s} value={s} />)}
      </datalist>

      {/* Add button */}
      <button
        type="button"
        onClick={addPair}
        className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-accent transition-colors pt-1`}
      >
        <Plus className="h-3 w-3" /> Add Setting
      </button>

      {/* JSON preview */}
      {pairs.some(p => p.key.trim()) && (
        <p className={`${mono.className} text-[9px] text-text-muted pt-1 break-all`}>
          {serialisePrintSettings(pairs)}
        </p>
      )}
    </div>
  );
}