import Link from 'next/link';
import { display, mono } from '@/lib/fonts';
import { ArrowRight, Home, Package } from 'lucide-react';

// Layer visualization — same motif as the home page hero
const LAYER_COUNT = 48;

function layerColor(i: number, total: number): string {
  const pct = 1 - i / total;
  if (pct > 0.85) return `rgba(13, 148, 136, ${0.6 + (pct - 0.85) / 0.15 * 0.35})`;
  if (pct > 0.5)  return `rgba(20, 184, 166, ${0.2 + (pct - 0.5)  / 0.35 * 0.4})`;
  return              `rgba(94, 234, 212,  ${0.06 + pct / 0.5 * 0.16})`;
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page flex flex-col">

      {/* Minimal header */}
      <header className="border-b border-border px-8 py-4 flex items-center justify-between">
        <Link
          href="/home"
          className={`${mono.className} text-[11px] uppercase tracking-[0.2em] text-text-primary hover:text-accent transition-colors`}
        >
          NoCo Make Lab
        </Link>
        <Link
          href="/home"
          className={`${mono.className} flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-text-muted hover:text-text-secondary transition-colors`}
        >
          <Home className="w-3 h-3" />
          Home
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="max-w-2xl w-full">

          {/* Layer stack — visual motif */}
          <div className="flex flex-col-reverse items-center gap-[2px] mb-10" aria-hidden>
            {Array.from({ length: LAYER_COUNT }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '3px',
                  width: `${28 + Math.sin(i * 0.4) * 6 + (i / LAYER_COUNT) * 18}%`,
                  background: layerColor(i, LAYER_COUNT),
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>

          {/* 404 heading */}
          <div className="text-center">
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-accent mb-3`}>
              Error 404
            </p>
            <h1
              className={`${display.className} text-text-primary leading-none mb-4`}
              style={{ fontSize: 'clamp(5rem, 18vw, 11rem)' }}
            >
              404
            </h1>
            <p
              className={`${display.className} text-text-secondary tracking-wide mb-2`}
              style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}
            >
              Layer not found
            </p>
            <p className={`${mono.className} text-[11px] text-text-muted max-w-sm mx-auto leading-relaxed mb-10`}>
              The page you&apos;re looking for doesn&apos;t exist or may have been moved.
              Let&apos;s get you back on track.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/home"
                className={`${mono.className} inline-flex items-center gap-2 bg-accent text-white text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-10 hover:bg-accent-dark transition-colors`}
              >
                <Home className="w-3.5 h-3.5" />
                Back to Home
              </Link>
              <Link
                href="/orders"
                className={`${mono.className} inline-flex items-center gap-2 border border-border text-text-secondary text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-10 hover:border-border-strong hover:text-text-primary transition-colors`}
              >
                <Package className="w-3.5 h-3.5" />
                My Orders
              </Link>
              <Link
                href="/upload"
                className={`${mono.className} inline-flex items-center gap-2 text-text-muted text-[10px] uppercase tracking-[0.18em] hover:text-text-secondary transition-colors`}
              >
                Start a Print
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-4">
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-text-muted text-center`}>
          © {new Date().getFullYear()} NoCo Make Lab — Loveland, CO
        </p>
      </footer>

    </div>
  );
}