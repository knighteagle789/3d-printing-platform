'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LayoutDashboard, Package, LogOut, ChevronDown } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f] text-white">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

function PublicNav() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, user, clearAuth } = useAuthStore();

  const handleSignOut = () => {
    clearAuth();
    router.push('/home');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0f0f0f]/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/home" className="text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">
          Print<span className="text-amber-400">Hub</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <Link href="/home" className="hover:text-white transition-colors">Home</Link>
          <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>

        <div className="flex items-center gap-3">
          {!isInitialized ? (
            <div className="w-20 h-8 bg-white/5 rounded animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white/70 hover:bg-white/15 gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                    <span className="text-amber-400 text-xs font-bold">
                      {user.firstName[0]}{user.lastName[0]}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm">
                    {user.firstName}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-zinc-900 border-white/10 text-white"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="gap-2 hover:bg-white/5 cursor-pointer"
                  onClick={() => router.push('/orders')}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 hover:bg-white/5 cursor-pointer"
                  onClick={() => router.push('/orders')}
                >
                  <Package className="h-4 w-4" />
                  My Orders
                </DropdownMenuItem>
                {(user.roles.includes('Admin') || user.roles.includes('Staff')) && (
                  <DropdownMenuItem
                    className="gap-2 hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push('/admin')}
                  >
                    <User className="h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="gap-2 text-red-400 hover:bg-white/5 hover:text-red-400 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="bg-amber-400 text-black hover:bg-amber-300 font-semibold" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="text-xl font-bold mb-3 font-[family-name:var(--font-syne)]">
            Print<span className="text-amber-400">Hub</span>
          </div>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Professional 3D printing services. From prototype to production —
            precision in every layer.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4">Navigate</p>
          <div className="space-y-2 text-sm text-white/50">
            <div><Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link></div>
            <div><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></div>
            <div><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></div>
            <div><Link href="/about" className="hover:text-white transition-colors">About</Link></div>
            <div><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></div>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4">Account</p>
          <div className="space-y-2 text-sm text-white/50">
            <div><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></div>
            <div><Link href="/register" className="hover:text-white transition-colors">Create Account</Link></div>
            <div><Link href="/orders" className="hover:text-white transition-colors">My Orders</Link></div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 text-white/20 text-xs">
        © {new Date().getFullYear()} PrintHub. All rights reserved.
      </div>
    </footer>
  );
}