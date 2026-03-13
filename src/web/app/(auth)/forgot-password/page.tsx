'use client';

// TODO: Implement forgot password functionality
// This requires:
//   Backend:
//     - POST /api/Auth/forgot-password  — accepts email, generates a reset token,
//       sends an email with a reset link (e.g. /reset-password?token=xxx)
//     - POST /api/Auth/reset-password   — accepts token + new password, validates
//       token expiry, updates the password hash
//     - PasswordResetToken entity (or store token on User) with expiry (~1 hour)
//     - Email service integration (SendGrid or similar) to deliver the reset link
//   Frontend:
//     - This page: send email form → success state ("check your inbox")
//     - /reset-password?token=xxx page: new password + confirm form
//   See GitHub issue #9 for full spec.

import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0d0a06] flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <Link href="/" className="mb-16">
        <span className={`${display.className} text-white text-2xl leading-none`}>
          NOCO MAKE<span className="text-amber-400"> LAB.</span>
        </span>
      </Link>

      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 border border-white/10 flex items-center justify-center mx-auto mb-8">
          <Clock className="h-5 w-5 text-amber-400/60" />
        </div>

        <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-4`}>
          Coming Soon
        </p>
        <h1
          className="font-black tracking-tight leading-[1.1] mb-5 text-white"
          style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
        >
          Password reset<br />isn&apos;t available yet.
        </h1>
        <p className="text-white/38 text-sm leading-relaxed mb-10">
          This feature is on the way. In the meantime, contact us at{' '}
          <a
            href="mailto:hello@nocomakelab.com"
            className="text-amber-400/70 hover:text-amber-400 transition-colors"
          >
            hello@nocomakelab.com
          </a>{' '}
          and we&apos;ll get you sorted.
        </p>

        <Link
          href="/login"
          className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/30 hover:text-white transition-colors`}
        >
          <ArrowLeft className="h-3 w-3" /> Back to Sign In
        </Link>
      </div>

    </div>
  );
}