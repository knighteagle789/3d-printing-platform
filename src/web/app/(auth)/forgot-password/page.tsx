'use client';

import { display, mono } from '@/lib/fonts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';


const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormValues = z.infer<typeof schema>;

const inputCls = `${mono.className} w-full h-11 bg-surface border border-border px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors rounded-none`;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => authApi.forgotPassword(data.email),
    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
      setSubmitted(true);
    },
  });

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <Link href="/home" className="mb-16">
        <span className={`${display.className} text-text-primary text-2xl leading-none`}>
          NOCO MAKE<span className="text-accent"> LAB.</span>
        </span>
      </Link>

      <div className="w-full max-w-sm">
        {submitted ? (
          // ── Success state ──
          <div className="text-center">
            <div className="w-12 h-12 border border-emerald-200 bg-emerald-50 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent mb-4`}>
              Check your inbox
            </p>
            <h1
              className="font-black tracking-tight leading-[1.1] mb-5 text-text-primary"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
            >
              Reset link sent.
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed mb-3">
              If an account exists for{' '}
              <span className="text-text-primary font-medium">{submittedEmail}</span>,
              you&apos;ll receive an email with a password reset link shortly.
            </p>
            <p className="text-text-muted text-xs leading-relaxed mb-10">
              The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
            </p>
            <Link
              href="/login"
              className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-text-muted hover:text-text-primary transition-colors`}
            >
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
          </div>
        ) : (
          // ── Form state ──
          <>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-accent mb-4`}>
              Password Reset
            </p>
            <h1
              className="font-black tracking-tight leading-[1.1] mb-3 text-text-primary"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
            >
              Forgot your<br />password?
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed mb-8">
              Enter the email address for your account and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
              <div className="space-y-2">
                <label className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-secondary`}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={inputCls}
                />
                {errors.email && (
                  <p className={`${mono.className} text-[9px] text-danger`}>
                    {errors.email.message}
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-text-muted hover:text-text-primary transition-colors`}
              >
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}