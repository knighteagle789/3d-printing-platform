'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Package, FileText, Layers, LayoutDashboard,
  Users, Image, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard, exact: true  },
  { href: '/admin/orders',    label: 'Orders',    icon: Package,         exact: false },
  { href: '/admin/quotes',    label: 'Quotes',    icon: FileText,        exact: false },
  { href: '/admin/materials', label: 'Materials', icon: Layers,          exact: false },
  { href: '/admin/users',     label: 'Users',     icon: Users,           exact: false },
  { href: '/admin/content',   label: 'Content',   icon: Image,           exact: false },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!user?.roles.includes('Admin') && !user?.roles.includes('Staff')) {
      router.push('/orders');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized || !isAuthenticated) return null;
  if (!user?.roles.includes('Admin') && !user?.roles.includes('Staff')) return null;

  const handleSignOut = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0d0a06] flex">

      {/* ── Mobile menu button ── */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 border border-white/10 bg-[#0d0a06] flex items-center justify-center text-white/50 hover:text-white transition-colors"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-56 bg-[#080705] border-r border-white/8
        flex flex-col transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/8 shrink-0">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className={`${display.className} text-white text-xl leading-none`}>
              NOCO MAKE<span className="text-amber-400"> LAB.</span>
            </span>
          </Link>
        </div>

        {/* Section label */}
        <div className="px-5 pt-6 pb-2">
          <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-white/20`}>
            Admin
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center justify-between px-3 py-2.5 transition-colors
                  ${isActive
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'text-white/35 hover:text-white hover:bg-white/[0.04]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.18em]`}>
                    {label}
                  </span>
                </div>
                {isActive && <ChevronRight className="h-3 w-3 text-amber-400/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 p-3 space-y-0.5 shrink-0">
          {/* Customer view */}
          <Link
            href="/orders"
            className="group flex items-center gap-3 px-3 py-2.5 text-white/25 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span className={`${mono.className} text-[10px] uppercase tracking-[0.18em]`}>
              Customer View
            </span>
          </Link>

          {/* User + sign out */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] text-white/40 truncate`}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className={`${mono.className} text-[8px] uppercase tracking-[0.12em] text-white/20 truncate`}>
                {user?.roles?.includes('Admin') ? 'Admin' : 'Staff'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 ml-2 p-1.5 text-white/20 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto lg:ml-0 min-w-0">
        {/* Top bar — mobile spacer + breadcrumb area */}
        <div className="h-14 border-b border-white/8 flex items-center px-6 lg:px-8 shrink-0">
          {/* Spacer for mobile menu button */}
          <div className="w-8 lg:hidden" />
          <BreadcrumbBar pathname={pathname} monoClass={mono.className} />
        </div>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function BreadcrumbBar({ pathname, monoClass }: { pathname: string; monoClass: string }) {
  const segments = pathname
    .replace('/admin', '')
    .split('/')
    .filter(Boolean);

  return (
    <div className={`${monoClass} flex items-center gap-2 text-[9px] uppercase tracking-[0.2em]`}>
      <Link href="/admin" className="text-white/25 hover:text-white/60 transition-colors">
        Admin
      </Link>
      {segments.map((seg, i) => {
        const href = '/admin/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        // Format: turn UUIDs into a shortened form, capitalise others
        const label = seg.length === 36
          ? seg.slice(0, 8) + '…'
          : seg.charAt(0).toUpperCase() + seg.slice(1);
        return (
          <span key={href} className="flex items-center gap-2">
            <ChevronRight className="h-2.5 w-2.5 text-white/15" />
            {isLast ? (
              <span className="text-white/50">{label}</span>
            ) : (
              <Link href={href} className="text-white/25 hover:text-white/60 transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}