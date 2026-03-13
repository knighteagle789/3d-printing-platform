'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const setAuth     = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await authApi.login(values);
      setAuth(response.data.user, response.data.token);
      const redirect = searchParams.get('redirect') ?? '/orders';
      router.push(redirect);
    } catch {
      setServerError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0a06] flex">

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative border-r border-white/8 flex-col justify-between p-14 overflow-hidden">
        {/* Grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo */}
        <Link href="/" className="relative">
          <span className={`${display.className} text-white text-3xl leading-none`}>
            NOCO MAKE<span className="text-amber-400"> LAB.</span>
          </span>
        </Link>

        {/* Display copy */}
        <div className="relative">
          <h2
            className={`${display.className} text-white leading-[0.88] mb-6`}
            style={{ fontSize: 'clamp(4rem, 7vw, 6rem)' }}
          >
            WELCOME<br />BACK<span className="text-amber-400">.</span>
          </h2>
          <p className="text-white/38 text-sm leading-relaxed max-w-xs">
            Sign in to track your orders, manage quotes, and upload new models for printing.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-16 lg:px-16">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-12">
          <span className={`${display.className} text-white text-2xl leading-none`}>
            NOCO MAKE<span className="text-amber-400"> LAB.</span>
          </span>
        </Link>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
            Sign In
          </p>
          <h1
            className="font-black tracking-tight leading-[1.1] mb-10 text-white"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}
          >
            Your account<br />awaits.
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/35`}>
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/18 focus-visible:ring-amber-400/40 focus-visible:border-amber-400/40 rounded-none h-11 text-sm"
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/35`}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/25 hover:text-amber-400/70 transition-colors`}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/18 focus-visible:ring-amber-400/40 focus-visible:border-amber-400/40 rounded-none h-11 text-sm"
              />
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>

            {serverError && (
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-red-400 bg-red-400/8 border border-red-400/20 px-4 py-3`}>
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`${mono.className} w-full h-12 bg-amber-400 text-black text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign In <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </form>

          <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/28 mt-8`}>
            No account?{' '}
            <Link href="/register" className="text-amber-400/70 hover:text-amber-400 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}