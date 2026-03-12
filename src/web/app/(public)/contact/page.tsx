'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { contactApi, ContactFormData } from '@/lib/api/contact';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Clock, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:    z.string().min(2, 'Name is required'),
  email:   z.string().email('Valid email required'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

// ─── Data ─────────────────────────────────────────────────────────────────────

const INFO = [
  {
    icon:  Mail,
    label: 'Email',
    value: 'hello@nocomakelab.com',
    sub:   'Reply within 1–2 business days',
  },
  {
    icon:  Clock,
    label: 'Hours',
    value: 'Mon–Fri + evenings & weekends',
    sub:   'Closed major holidays',
  },
  {
    icon:  MapPin,
    label: 'Location',
    value: 'Loveland, Colorado',
    sub:   'Local pickup always available',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: ContactFormData) => contactApi.submit(data),
    onSuccess: () => { setSubmitted(true); reset(); },
    onError:   () => toast.error('Failed to send message. Please try again.'),
  });

  return (
    <div className="pt-16 bg-[#0d0a06]">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative py-28 px-6 border-b border-white/10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end gap-8 justify-between">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-amber-400/70 mb-6`}>
              Get in Touch
            </p>
            <h1
              className={`${display.className} text-white leading-[0.88]`}
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
            >
              LET&apos;S<br />
              TALK<span className="text-amber-400">.</span>
            </h1>
          </div>
          <p className="text-white/40 text-base leading-relaxed max-w-sm md:mb-3">
            Have a project in mind? A question about materials or lead times?
            Reach out — we respond within 1–2 business days.
          </p>
        </div>
      </section>


      {/* ════════════════════════════ BODY ════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-px bg-white/8">

          {/* ── Left panel ── */}
          <div className="lg:col-span-2 bg-[#0d0a06] p-10 flex flex-col gap-12">

            {/* Contact info */}
            <div>
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-white/22 mb-8`}>
                Contact Info
              </p>
              <div className="space-y-8">
                {INFO.map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="flex gap-5 items-start">
                    <div className="w-9 h-9 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-white/28 mb-1`}>
                        {label}
                      </p>
                      <p className="text-white/80 text-sm font-semibold" style={{ fontFamily: 'var(--font-epilogue)' }}>
                        {value}
                      </p>
                      <p className="text-white/32 text-xs mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/8" />

            {/* Ready to order upsell */}
            <div>
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-white/22 mb-5`}>
                Ready to Order?
              </p>
              <p className="text-white/45 text-sm leading-relaxed mb-6">
                Skip the form — create an account and upload your model directly
                to get an instant estimate.
              </p>
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-amber-400 text-black text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-10 hover:bg-amber-300 transition-colors`}
              >
                Create Free Account <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* ── Right panel — form ── */}
          <div className="lg:col-span-3 bg-[#0d0a06] p-10">
            {submitted ? (
              <SuccessState onReset={() => setSubmitted(false)} mono={mono.className} display={display.className} />
            ) : (
              <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-7">
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-white/22 mb-8`}>
                  Send a Message
                </p>

                {/* Name + Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Your Name" error={errors.name?.message} monoClass={mono.className}>
                    <StyledInput id="name" placeholder="Jane Smith" {...register('name')} />
                  </Field>
                  <Field label="Email Address" error={errors.email?.message} monoClass={mono.className}>
                    <StyledInput id="email" type="email" placeholder="jane@example.com" {...register('email')} />
                  </Field>
                </div>

                {/* Subject */}
                <Field label="Subject" error={errors.subject?.message} monoClass={mono.className}>
                  <StyledInput
                    id="subject"
                    placeholder="e.g. Quote for mechanical prototype"
                    {...register('subject')}
                  />
                </Field>

                {/* Message */}
                <Field label="Message" error={errors.message?.message} monoClass={mono.className}>
                  <Textarea
                    id="message"
                    rows={7}
                    placeholder="Tell us about your project — material preferences, quantity, timeline, any special requirements..."
                    {...register('message')}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/18 focus-visible:ring-amber-400/40 focus-visible:border-amber-400/40 resize-none rounded-none text-sm"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className={`${mono.className} w-full h-12 bg-amber-400 text-black text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
                >
                  {mutation.isPending ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>Send Message <ArrowRight className="h-3.5 w-3.5" /></>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label, error, children, monoClass,
}: {
  label: string; error?: string; children: React.ReactNode; monoClass: string;
}) {
  return (
    <div className="space-y-2">
      <Label className={`${monoClass} text-[9px] uppercase tracking-[0.22em] text-white/35`}>
        {label}
      </Label>
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

import React from 'react';

const StyledInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <Input
    ref={ref}
    {...props}
    className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/18 focus-visible:ring-amber-400/40 focus-visible:border-amber-400/40 rounded-none h-11 text-sm"
  />
));
StyledInput.displayName = 'StyledInput';

function SuccessState({
  onReset, mono, display,
}: {
  onReset: () => void; mono: string; display: string;
}) {
  return (
    <div className="h-full flex flex-col items-start justify-center gap-6 py-16">
      <CheckCircle2 className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
      <div>
        <h3
          className={`${display} text-white leading-[0.88] mb-3`}
          style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}
        >
          MESSAGE<br />SENT<span className="text-amber-400">.</span>
        </h3>
        <p className="text-white/45 text-sm leading-relaxed max-w-sm">
          Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.
        </p>
      </div>
      <button
        onClick={onReset}
        className={`${mono} inline-flex items-center gap-2 border border-white/12 text-white/50 text-[10px] uppercase tracking-[0.2em] px-6 h-9 hover:text-white hover:border-white/25 transition-colors`}
      >
        Send Another
      </button>
    </div>
  );
}