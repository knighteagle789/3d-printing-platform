'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Package, FileText, Layers, LayoutDashboard, Users, Image } from 'lucide-react';

const navLinks = [
  { href: '/admin/orders',    label: 'Orders',    icon: Package       },
  { href: '/admin/quotes',    label: 'Quotes',    icon: FileText      },
  { href: '/admin/materials', label: 'Materials', icon: Layers        },
  { href: '/admin/users',     label: 'Users',     icon: Users         },
  { href: '/admin/content',   label: 'Content',   icon: LayoutDashboard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!user?.roles.includes('Admin') && !user?.roles.includes('Staff')) {
      router.push('/orders');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  if (!isInitialized || !isAuthenticated) return null;
  if (!user?.roles.includes('Admin') && !user?.roles.includes('Staff')) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/admin" className="font-bold text-lg">
            Print<span className="text-primary">Hub</span>
            <span className="text-xs text-muted-foreground ml-2">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <Link
            href="/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Customer View
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}