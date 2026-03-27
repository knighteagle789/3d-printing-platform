/**
 * Canonical font definitions for NoCo Make Lab.
 *
 * Import from here instead of calling next/font/google directly in pages or
 * components. Defining each font once avoids redundant loader instances and
 * ensures consistent weight/subset options across the app.
 *
 * Usage:
 *   import { mono, display } from '@/lib/fonts';
 *   <span className={mono.className}>…</span>
 *
 * CSS variables (set on <body> in app/layout.tsx):
 *   --font-epilogue        → Epilogue (display headings)
 *   --font-dm-sans         → DM Sans (body text)
 *   --font-jetbrains-mono  → JetBrains Mono (labels, badges, buttons)
 *   --font-bebas-neue      → Bebas Neue (hero / large display)
 */

import { Epilogue, DM_Sans, JetBrains_Mono, Bebas_Neue } from 'next/font/google';

export const epilogue = Epilogue({
  variable: '--font-epilogue',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

/** Monospace — labels, badges, CTA buttons, code snippets. */
export const mono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

/** Large display / hero — Bebas Neue. */
export const display = Bebas_Neue({
  variable: '--font-bebas-neue',
  weight: '400',
  subsets: ['latin'],
});