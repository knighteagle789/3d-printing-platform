'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Package,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const NAV_LINKS = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/pricing',   label: 'Pricing'   },
  { href: '/about',     label: 'About'     },
  { href: '/contact',   label: 'Contact'   },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d0a06] text-white">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function PublicNav() {
  const router    = useRouter();
  const pathname  = usePathname();
  const { isAuthenticated, isInitialized, user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  // Close mobile menu on route change
  // NOTE: handled via onClick on each mobile link — avoids synchronous
  // setState inside an effect body which triggers cascading renders.

  // Subtle border intensifies on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSignOut = () => {
    clearAuth();
    router.push('/home');
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
        style={{
          background:     scrolled ? 'rgba(13,10,6,0.97)' : 'rgba(13,10,6,0.88)',
          borderBottom:   scrolled ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/home" className="shrink-0 flex items-baseline leading-none">
            <span className={`${display.className} text-white text-[1.5rem] tracking-wide`}>
              NOCO&nbsp;MAKE
            </span>
            <span className={`${display.className} text-amber-400 text-[1.5rem] tracking-wide`}>
              &nbsp;LAB.
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`
                  ${mono.className} text-[10px] uppercase tracking-[0.22em] px-4 py-2
                  transition-colors duration-150 relative
                  ${isActive(href) ? 'text-white' : 'text-white/42 hover:text-white/80'}
                `}
              >
                {label}
                {isActive(href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-px bg-amber-400" />
                )}
              </Link>
            ))}
          </div>

          {/* Right — auth */}
          <div className="flex items-center gap-2 shrink-0">
            {!isInitialized ? (
              <div className="w-20 h-8 bg-white/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`
                    ${mono.className} flex items-center gap-2 text-[10px] uppercase tracking-[0.15em]
                    text-white/55 hover:text-white transition-colors px-3 py-2
                    border border-white/10 hover:border-white/22
                  `}>
                    <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                      <span className="text-amber-400 text-[9px] font-bold leading-none">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    <span className="hidden sm:inline">{user.firstName}</span>
                    <ChevronDown className="h-3 w-3 opacity-40" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-[#0d0a06] border border-white/12 text-white rounded-none shadow-2xl p-0"
                >
                  <div className="px-3 py-2.5 border-b border-white/8">
                    <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em] text-white/80`}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p className={`${mono.className} text-[9px] text-white/30 truncate mt-0.5`}>
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuItem
                    className={`${mono.className} gap-2.5 text-[10px] uppercase tracking-[0.15em] text-white/55 hover:text-white hover:bg-white/5 cursor-pointer py-2.5 rounded-none`}
                    onClick={() => router.push('/orders')}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={`${mono.className} gap-2.5 text-[10px] uppercase tracking-[0.15em] text-white/55 hover:text-white hover:bg-white/5 cursor-pointer py-2.5 rounded-none`}
                    onClick={() => router.push('/orders')}
                  >
                    <Package className="h-3.5 w-3.5" /> My Orders
                  </DropdownMenuItem>
                  {(user.roles.includes('Admin') || user.roles.includes('Staff')) && (
                    <DropdownMenuItem
                      className={`${mono.className} gap-2.5 text-[10px] uppercase tracking-[0.15em] text-amber-400/70 hover:text-amber-400 hover:bg-white/5 cursor-pointer py-2.5 rounded-none`}
                      onClick={() => router.push('/admin')}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/8 my-0" />
                  <DropdownMenuItem
                    className={`${mono.className} gap-2.5 text-[10px] uppercase tracking-[0.15em] text-red-400/70 hover:text-red-400 hover:bg-white/5 cursor-pointer py-2.5 rounded-none`}
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className={`${mono.className} hidden sm:inline-flex text-[10px] uppercase tracking-[0.18em] text-white/42 hover:text-white transition-colors px-4 py-2`}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={`${mono.className} inline-flex items-center text-[10px] uppercase tracking-[0.18em] font-semibold bg-amber-400 text-black px-5 h-9 hover:bg-amber-300 transition-colors`}
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 text-white/55 hover:text-white transition-colors ml-1"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ───────────────────────────────────────────────────── */}
      <div
        className="md:hidden fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          opacity:       mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <div
          className="absolute top-16 left-0 right-0 bg-[#0d0a06] border-b border-white/12 transition-transform duration-200"
          style={{ transform: mobileOpen ? 'translateY(0)' : 'translateY(-6px)' }}
        >
          {/* Nav links */}
          <div className="px-6 py-2 border-b border-white/8">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                  ${mono.className} flex items-center justify-between
                  text-[11px] uppercase tracking-[0.22em] py-4
                  border-b border-white/5 last:border-0 transition-colors
                  ${isActive(href) ? 'text-white' : 'text-white/45 hover:text-white'}
                `}
              >
                {label}
                {isActive(href) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="px-6 py-5">
            {isAuthenticated && user ? (
              <div className="space-y-0.5">
                <div className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/22 mb-3`}>
                  {user.firstName} {user.lastName}
                </div>
                {[
                  { label: 'Dashboard', icon: <LayoutDashboard className="h-3.5 w-3.5" />, path: '/orders' },
                  { label: 'My Orders', icon: <Package className="h-3.5 w-3.5" />, path: '/orders' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { router.push(item.path); setMobileOpen(false); }}
                    className={`${mono.className} w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/50 hover:text-white py-3 transition-colors`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                {(user.roles.includes('Admin') || user.roles.includes('Staff')) && (
                  <button
                    onClick={() => { router.push('/admin'); setMobileOpen(false); }}
                    className={`${mono.className} w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-amber-400/60 hover:text-amber-400 py-3 transition-colors`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Admin Panel
                  </button>
                )}
                <div className="pt-2 border-t border-white/8 mt-2">
                  <button
                    onClick={handleSignOut}
                    className={`${mono.className} w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-red-400/60 hover:text-red-400 py-3 transition-colors`}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className={`${mono.className} flex-1 flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-white/50 border border-white/15 h-11 hover:text-white hover:border-white/30 transition-colors`}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={`${mono.className} flex-1 flex items-center justify-center text-[10px] uppercase tracking-[0.18em] font-semibold bg-amber-400 text-black h-11 hover:bg-amber-300 transition-colors`}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function PublicFooter() {
  return (
    <footer className="bg-[#0d0a06] border-t border-white/10">

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

        {/* Brand */}
        <div className="md:col-span-5">
          <Link href="/home" className="inline-flex items-baseline leading-none mb-5">
            <span className={`${display.className} text-white text-[1.5rem] tracking-wide`}>
              NOCO&nbsp;MAKE
            </span>
            <span className={`${display.className} text-amber-400 text-[1.5rem] tracking-wide`}>
              &nbsp;LAB.
            </span>
          </Link>
          <p className="text-white/50 text-sm leading-relaxed max-w-[22rem] mb-8">
            Precision 3D printing for engineers, designers, and makers —
            right here in Northern Colorado. Every layer, dialled in.
          </p>
          <div className={`${mono.className} flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-white/22`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/45 shrink-0" />
            Loveland, CO · Est. 2024
          </div>
        </div>

        <div className="hidden md:block md:col-span-1" />

        {/* Navigate */}
        <div className="md:col-span-3">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-white/22 mb-6`}>
            Navigate
          </p>
          <div className="space-y-3.5">
            {[
              { href: '/portfolio', label: 'Portfolio' },
              { href: '/pricing',   label: 'Pricing'   },
              { href: '/about',     label: 'About'      },
              { href: '/contact',   label: 'Contact'    },
              { href: '/blog',      label: 'Blog'       },
            ].map(({ href, label }) => (
              <div key={href}>
                <Link
                  href={href}
                  className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-white/35 hover:text-white transition-colors`}
                >
                  {label}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="md:col-span-3">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-white/22 mb-6`}>
            Account
          </p>
          <div className="space-y-3.5">
            {[
              { href: '/login',    label: 'Sign In'        },
              { href: '/register', label: 'Create Account' },
              { href: '/orders',   label: 'My Orders'      },
              { href: '/quotes',   label: 'My Quotes'      },
            ].map(({ href, label }) => (
              <div key={href}>
                <Link
                  href={href}
                  className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-white/35 hover:text-white transition-colors`}
                >
                  {label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/18`}>
            © {new Date().getFullYear()} NoCo Make Lab · All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {[
              { href: '/contact', label: 'Contact' },
              { href: '/pricing', label: 'Pricing' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/18 hover:text-white/45 transition-colors`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}