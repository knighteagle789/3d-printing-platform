/**
 * NoCo Make Lab — Design Tokens
 *
 * Single source of truth for theme colors used in inline `style={{}}` props.
 * CSS custom properties (for Tailwind utilities) live in globals.css.
 *
 * To retheme: update the values below AND the matching :root vars in globals.css.
 */

export const theme = {
  // ── Page surfaces ────────────────────────────────────────────────────────
  pageBg:        '#f9fafb',
  surface:       '#ffffff',
  surfaceAlt:    '#f3f4f6',

  // ── Sidebar ──────────────────────────────────────────────────────────────
  sidebarBg:     '#134e4a',
  sidebarHover:  '#1a6b66',
  sidebarActive: '#0f3d3a',

  // ── Accent (primary interactive color) ───────────────────────────────────
  accent:        '#0d9488',
  accentDark:    '#0f766e',
  accentLight:   '#f0fdfa',
  accentBorder:  '#99f6e4',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary:   '#111827',
  textSecondary: '#6b7280',
  textMuted:     '#9ca3af',

  // ── Border ───────────────────────────────────────────────────────────────
  border:        '#e5e7eb',
  borderStrong:  '#d1d5db',

  // ── Nav text (on dark sidebar) ────────────────────────────────────────────
  navTextActive:   '#ffffff',
  navTextInactive: 'rgba(255,255,255,0.40)',
  navAccent:       '#99f6e4',   // active indicator bar + active icon tint

  // ── Semantic status ───────────────────────────────────────────────────────
  success:       '#0f766e',
  successBg:     '#f0fdfa',
  successBorder: '#99f6e4',
  warning:       '#b45309',
  warningBg:     '#fffbeb',
  warningBorder: '#fcd34d',
  danger:        '#dc2626',
  dangerBg:      '#fee2e2',
  dangerBorder:  '#fca5a5',
  info:          '#1d4ed8',
  infoBg:        '#eff6ff',
  infoBorder:    '#bfdbfe',
} as const;

export type Theme = typeof theme;