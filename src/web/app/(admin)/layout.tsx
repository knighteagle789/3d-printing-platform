'use client';

import { display, mono } from '@/lib/fonts';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Package, FileText, Layers, LayoutDashboard,
  Users, Image, ChevronRight, LogOut, Menu, X, Camera,
} from 'lucide-react';


const NAV_LINKS = [
  { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard, exact: true  },
  { href: '/admin/orders',    label: 'Orders',    icon: Package,         exact: false },
  { href: '/admin/quotes',    label: 'Quotes',    icon: FileText,        exact: false },
  { href: '/admin/materials', label: 'Materials', icon: Layers,          exact: false },
  { href: '/admin/intake',    label: 'Intake',    icon: Camera,          exact: false },
  { href: '/admin/users',     label: 'Users',     icon: Users,           exact: false },
  { href: '/admin/content',   label: 'Content',   icon: Image,           exact: false },
];

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

  const handleSignOut = () => { clearAuth(); router.push('/login'); };

  return (
    <div className="min-h-screen flex bg-page">

      {/* ── Mobile menu button ── */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-56 flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div
          className="h-14 flex items-center px-5 shrink-0 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className={`${display.className} text-white text-xl leading-none`}>
              NOCO MAKE<span style={{ color: 'var(--nav-accent)' }}> LAB.</span>
            </span>
          </Link>
        </div>

        {/* Section label */}
        <div className="px-5 pt-6 pb-2">
          <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em]`}
             style={{ color: 'rgba(255,255,255,0.20)' }}>
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
                className="group flex items-center justify-between px-3 py-2.5 transition-colors"
                style={{
                  color:           isActive ? '#ffffff' : 'rgba(255,255,255,0.35)',
                  background:      isActive ? 'var(--sidebar-active)' : 'transparent',
                  borderLeft:      isActive ? '2px solid var(--nav-accent)' : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: isActive ? 'var(--nav-accent)' : 'rgba(255,255,255,0.30)' }}
                  />
                  <span className={`${mono.className} text-[10px] uppercase tracking-[0.18em]`}>
                    {label}
                  </span>
                </div>
                {isActive && (
                  <ChevronRight className="h-3 w-3" style={{ color: 'var(--nav-accent)', opacity: 0.6 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="border-t p-3 space-y-0.5 shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <Link
            href="/orders"
            className="group flex items-center gap-3 px-3 py-2.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)';
              (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span className={`${mono.className} text-[10px] uppercase tracking-[0.18em]`}>
              Customer View
            </span>
          </Link>

          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] truncate`}
                 style={{ color: 'rgba(255,255,255,0.40)' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className={`${mono.className} text-[8px] uppercase tracking-[0.12em] truncate`}
                 style={{ color: 'rgba(255,255,255,0.20)' }}>
                {user?.roles?.includes('Admin') ? 'Admin' : 'Staff'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 ml-2 p-1.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.20)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.20)'; }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto lg:ml-0 min-w-0">
        {/* Topbar */}
        <div className="h-14 border-b border-border bg-surface flex items-center px-6 lg:px-8 shrink-0">
          <div className="w-8 lg:hidden" />
          <BreadcrumbBar pathname={pathname} monoClass={mono.className} />
        </div>

        <div className="p-6 lg:p-8 bg-page min-h-[calc(100vh-3.5rem)]">
          {children}
        </div>
      </main>

    </div>
  );
}

function BreadcrumbBar({ pathname, monoClass }: { pathname: string; monoClass: string }) {
  const segments = pathname
    .replace('/admin', '')
    .split('/')
    .filter(Boolean);

  return (
    <div className={`${monoClass} flex items-center gap-2 text-[9px] uppercase tracking-[0.2em]`}>
      <Link href="/admin" className="text-text-muted hover:text-text-secondary transition-colors">
        Admin
      </Link>
      {segments.map((seg, i) => {
        const href   = '/admin/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        const label  = seg.length === 36
          ? seg.slice(0, 8) + '…'
          : seg.charAt(0).toUpperCase() + seg.slice(1);
        return (
          <span key={href} className="flex items-center gap-2">
            <ChevronRight className="h-2.5 w-2.5 text-text-muted" />
            {isLast ? (
              <span className="text-text-secondary">{label}</span>
            ) : (
              <Link href={href} className="text-text-muted hover:text-text-secondary transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}