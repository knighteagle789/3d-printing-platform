'use client';

import { display, mono } from '@/lib/fonts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ArrowRight } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';


const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Shared input class — reads from globals.css tokens
const inputCls = `w-full h-11 bg-surface border border-border px-3 text-sm text-text-primary
  placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`;

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const setAuth      = useAuthStore((state) => state.setAuth);
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
    <div className="min-h-screen flex">

      {/* ── Left brand panel (teal) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-14 overflow-hidden"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo */}
        <Link href="/" className="relative">
          <span className={`${display.className} text-white text-3xl leading-none`}>
            NOCO MAKE<span style={{ color: 'var(--nav-accent)' }}> LAB.</span>
          </span>
        </Link>

        {/* Display copy */}
        <div className="relative">
          <h2
            className={`${display.className} text-white leading-[0.88] mb-6`}
            style={{ fontSize: 'clamp(4rem, 7vw, 6rem)' }}
          >
            WELCOME<br />BACK<span style={{ color: 'var(--nav-accent)' }}>.</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Sign in to track your orders, manage quotes, and upload new models for printing.
          </p>
        </div>
      </div>

      {/* ── Right form panel (light) ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-16 lg:px-16 bg-page">

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-12">
          <span className={`${display.className} text-text-primary text-2xl leading-none`}>
            NOCO MAKE<span className="text-accent"> LAB.</span>
          </span>
        </Link>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent mb-5`}>
            Sign In
          </p>
          <h1
            className="font-black tracking-tight leading-[1.1] mb-10 text-text-primary"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}
          >
            Your account<br />awaits.
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted`}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={inputCls}
              />
              {errors.email && (
                <p className={`${mono.className} text-[10px] text-danger`}>{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted`}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-accent transition-colors`}
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                placeholder="••••••••"
                {...register('password')}
                className={inputCls}
              />
              {errors.password && (
                <p className={`${mono.className} text-[10px] text-danger`}>{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-danger bg-danger-bg border border-danger-bg px-4 py-3`}>
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`${mono.className} w-full h-12 bg-accent text-white text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign In <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </form>

          <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted mt-8`}>
            No account?{' '}
            <Link href="/register" className="text-accent hover:text-accent-dark transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}