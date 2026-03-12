'use client';

import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type ProjectDetailPair = { key: string; value: string };

interface Props {
  pairs:     ProjectDetailPair[];
  onChange:  (pairs: ProjectDetailPair[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deserialise a stored JSON string back to pairs. Returns [] on any failure. */
export function parseProjectDetails(raw: string | null | undefined): ProjectDetailPair[] {
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

/** Serialise pairs to a JSON string for the API, filtering out blank keys. */
export function serialiseProjectDetails(
  pairs: ProjectDetailPair[],
): string | undefined {
  const entries = pairs.filter(p => p.key.trim());
  if (entries.length === 0) return undefined;
  return JSON.stringify(
    Object.fromEntries(entries.map(p => [p.key.trim(), p.value.trim()])),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Print Time', 'Layer Height', 'Infill', 'Material', 'Supports',
  'Post-Processing', 'Scale', 'Wall Thickness',
];

export function ProjectDetailsEditor({ pairs, onChange }: Props) {
  const addPair = () => onChange([...pairs, { key: '', value: '' }]);

  const updatePair = (index: number, field: 'key' | 'value', val: string) => {
    const next = pairs.map((p, i) => (i === index ? { ...p, [field]: val } : p));
    onChange(next);
  };

  const removePair = (index: number) =>
    onChange(pairs.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {pairs.length === 0 && (
        <p className="text-muted-foreground text-sm py-1">
          No details yet — add key / value pairs below.
        </p>
      )}

      {pairs.map((pair, i) => (
        <div key={i} className="flex gap-2 items-start">
          {/* Key */}
          <div className="flex-1">
            <Input
              value={pair.key}
              onChange={e => updatePair(i, 'key', e.target.value)}
              placeholder="Key (e.g. Print Time)"
              list="project-detail-keys"
              className="font-medium"
            />
          </div>

          {/* Value */}
          <div className="flex-[2]">
            <Input
              value={pair.value}
              onChange={e => updatePair(i, 'value', e.target.value)}
              placeholder="Value (e.g. 8 hours)"
            />
          </div>

          {/* Remove */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removePair(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {/* Datalist for key suggestions */}
      <datalist id="project-detail-keys">
        {SUGGESTIONS.map(s => <option key={s} value={s} />)}
      </datalist>

      <Button type="button" variant="outline" size="sm" onClick={addPair} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Detail
      </Button>

      {pairs.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Preview:{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            {JSON.stringify(
              Object.fromEntries(pairs.filter(p => p.key).map(p => [p.key, p.value])),
            )}
          </code>
        </p>
      )}
    </div>
  );
}