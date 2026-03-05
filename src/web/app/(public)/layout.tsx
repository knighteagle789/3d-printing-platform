import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0f0f0f]/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/home" className="text-xl font-bold tracking-tight">
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
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" className="bg-amber-400 text-black hover:bg-amber-300 font-semibold" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
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
          <div className="text-xl font-bold mb-3">
            Print<span className="text-amber-400">Hub</span>
          </div>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Professional 3D printing services. From prototype to production — 
            precision in every layer.
          </p>
        </div>
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Navigate</p>
          <div className="space-y-2 text-sm text-white/60">
            <div><Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link></div>
            <div><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></div>
            <div><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></div>
            <div><Link href="/about" className="hover:text-white transition-colors">About</Link></div>
            <div><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></div>
          </div>
        </div>
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Account</p>
          <div className="space-y-2 text-sm text-white/60">
            <div><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></div>
            <div><Link href="/register" className="hover:text-white transition-colors">Create Account</Link></div>
            <div><Link href="/dashboard/orders" className="hover:text-white transition-colors">My Orders</Link></div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 text-white/30 text-xs">
        © {new Date().getFullYear()} PrintHub. All rights reserved.
      </div>
    </footer>
  );
}