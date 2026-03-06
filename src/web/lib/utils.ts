import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toProxiedUrl(url: string): string {
  if (!url) return url;
  return url.replace('http://127.0.0.1:10000', '/api/blob');
}