'use client';

import { display, mono } from '@/lib/fonts';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { PasswordInput } from '@/components/ui/password-input';


const schema = z.object({
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path:    ['confirmPassword'],
});
type FormValues = z.infer<typeof schema>;

const inputCls = `${mono.className} w-full h-11 bg-surface border border-border px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors rounded-none`;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');

  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      authApi.resetPassword(token!, data.newPassword),
    onSuccess: () => {
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    },
  });

  // No token in URL — show invalid state immediately
  if (!token) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
        <Link href="/home" className="mb-16">
          <span className={`${display.className} text-text-primary text-2xl leading-none`}>
            NOCO MAKE<span className="text-accent"> LAB.</span>
          </span>
        </Link>
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 border border-red-200 bg-red-50 flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <h1
            className="font-black tracking-tight leading-[1.1] mb-4 text-text-primary"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
          >
            Invalid link.
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            This password reset link is invalid or has expired.
            Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className={`${mono.className} inline-flex items-center justify-center bg-accent text-white text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-10 hover:bg-accent/90 transition-colors`}
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <Link href="/home" className="mb-16">
        <span className={`${display.className} text-text-primary text-2xl leading-none`}>
          NOCO MAKE<span className="text-accent"> LAB.</span>
        </span>
      </Link>

      <div className="w-full max-w-sm">
        {success ? (
          // ── Success state ──
          <div className="text-center">
            <div className="w-12 h-12 border border-emerald-200 bg-emerald-50 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent mb-4`}>
              All done
            </p>
            <h1
              className="font-black tracking-tight leading-[1.1] mb-5 text-text-primary"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
            >
              Password reset.
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed mb-8">
              Your password has been updated. Redirecting you to sign in...
            </p>
            <Link
              href="/login"
              className={`${mono.className} inline-flex items-center justify-center bg-accent text-white text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-10 hover:bg-accent/90 transition-colors`}
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          // ── Form state ──
          <>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent mb-4`}>
              New Password
            </p>
            <h1
              className="font-black tracking-tight leading-[1.1] mb-3 text-text-primary"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
            >
              Reset your<br />password.
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed mb-8">
              Choose a new password for your account. Must be at least 8 characters.
            </p>

            {/* Server error */}
            {mutation.isError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 px-4 py-3 mb-6">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className={`${mono.className} text-[9px] text-red-600`}>
                  This reset link is invalid or has expired. Please{' '}
                  <Link href="/forgot-password" className="underline">request a new one</Link>.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
              <div className="space-y-2">
                <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-secondary`}>
                  New Password
                </label>
                <PasswordInput
                  placeholder="At least 8 characters"
                  {...register('newPassword')}
                  className={inputCls}
                />
                {errors.newPassword && (
                  <p className={`${mono.className} text-[9px] text-danger`}>
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-secondary`}>
                  Confirm Password
                </label>
                <PasswordInput
                  placeholder="Repeat your new password"
                  {...register('confirmPassword')}
                  className={inputCls}
                />
                {errors.confirmPassword && (
                  <p className={`${mono.className} text-[9px] text-danger`}>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className={`${mono.className} w-full h-12 bg-accent text-white text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
              >
                {mutation.isPending ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Set New Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}