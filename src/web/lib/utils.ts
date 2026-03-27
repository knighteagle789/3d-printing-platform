import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Material } from "@/lib/api/materials";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toProxiedUrl(url: string): string {
  if (!url) return url;
  return url.replace('http://127.0.0.1:10000', '/api/blob');
}

/** "InReview" → "In Review", "QuoteProvided" → "Quote Provided" */
export function formatStatus(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').trim();
}

/** Groups a flat material list by type, computing per-group min/max price. */
export type MaterialGroup = {
  type:     string;
  variants: Material[];
  minPrice: number;
  maxPrice: number;
};

export function groupMaterials(materials: Material[]): MaterialGroup[] {
  const map = new Map<string, Material[]>();
  for (const m of materials) {
    map.set(m.type, [...(map.get(m.type) ?? []), m]);
  }
  return Array.from(map.entries()).map(([type, variants]) => ({
    type,
    variants,
    minPrice: Math.min(...variants.map(v => v.pricePerGram)),
    maxPrice: Math.max(...variants.map(v => v.pricePerGram)),
  }));
}