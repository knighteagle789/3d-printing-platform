'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Upload, Package, FileText, User, LogOut, ShieldCheck, ExternalLink } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono  = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

const navLinks = [
  { href: '/upload',  label: 'Upload',  icon: Upload   },
  { href: '/orders',  label: 'Orders',  icon: Package  },
  { href: '/quotes',  label: 'Quotes',  icon: FileText },
  { href: '/profile', label: 'Profile', icon: User     },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) router.push('/login');
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized || !isAuthenticated) return null;

  const isAdmin = user?.roles.includes('Admin') || user?.roles.includes('Staff');

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-page">

      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex flex-col shrink-0 border-r border-border bg-surface"
        
      >
        {/* Wordmark */}
        <div className="h-14 flex items-center px-5 border-b border-border shrink-0">
          <Link href="/upload" className="flex items-baseline gap-1.5">
            <span className={`${bebas.className} text-2xl text-text-primary tracking-wide leading-none`}>
              NOCO
            </span>
            <span className={`${bebas.className} text-2xl text-accent tracking-wide leading-none`}>
              MAKE LAB
            </span>
          </Link>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 border-b border-border">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted mb-0.5`}>
            Signed in as
          </p>
          <p className={`${mono.className} text-[11px] text-text-secondary truncate`}>
            {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/upload' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 transition-colors relative
                  ${isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-accent" />
                )}
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-accent' : ''}`} />
                <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-border space-y-0.5">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 text-text-muted hover:text-accent transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
                Admin Panel
              </span>
            </Link>
          )}

          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 text-text-muted hover:text-text-secondary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
              Public Site
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-text-muted hover:text-red-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}