'use client';

import { display, mono } from '@/lib/fonts';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { contactApi, ContactFormData } from '@/lib/api/contact';
import { Label } from '@/components/ui/label';
import { Mail, Clock, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';


const schema = z.object({
  name:    z.string().min(2, 'Name is required'),
  email:   z.string().email('Valid email required'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

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

// Shared input class — light theme
const inputCls = `${mono.className} w-full h-11 bg-surface border border-border px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors rounded-none`;
const textareaCls = `${mono.className} w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none rounded-none`;

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
    <div className="pt-16 bg-page">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative py-28 px-6 border-b border-border overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end gap-8 justify-between">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-accent/70 mb-6`}>
              Get in Touch
            </p>
            <h1
              className={`${display.className} text-text-primary leading-[0.88]`}
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
            >
              LET&apos;S<br />
              TALK<span className="text-accent">.</span>
            </h1>
          </div>
          <p className="text-text-secondary text-base leading-relaxed max-w-sm md:mb-3">
            Have a project in mind? A question about materials or lead times?
            Reach out — we respond within 1–2 business days.
          </p>
        </div>
      </section>


      {/* ════════════════════════════ BODY ════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-px bg-border">

          {/* ── Left panel ── */}
          <div className="lg:col-span-2 bg-surface p-10 flex flex-col gap-12">

            <div>
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-text-muted mb-8`}>
                Contact Info
              </p>
              <div className="space-y-8">
                {INFO.map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="flex gap-5 items-start">
                    <div className="w-9 h-9 border border-border flex items-center justify-center shrink-0 bg-accent-light">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div>
                      <p className={`${mono.className} text-[9px] uppercase tracking-[0.22em] text-text-muted mb-1`}>
                        {label}
                      </p>
                      <p className="text-text-primary text-sm font-semibold" style={{ fontFamily: 'var(--font-epilogue)' }}>
                        {value}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            <div>
              <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-text-muted mb-5`}>
                Ready to Order?
              </p>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Skip the form — create an account and upload your model directly
                to get an instant estimate.
              </p>
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-accent text-white text-[10px] uppercase tracking-[0.18em] font-semibold px-6 h-10 hover:bg-accent/90 transition-colors`}
              >
                Create Free Account <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* ── Right panel — form ── */}
          <div className="lg:col-span-3 bg-surface p-10">
            {submitted ? (
              <SuccessState onReset={() => setSubmitted(false)} mono={mono.className} display={display.className} />
            ) : (
              <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-7">
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.28em] text-text-muted mb-8`}>
                  Send a Message
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Your Name" error={errors.name?.message} monoClass={mono.className}>
                    <input id="name" placeholder="Jane Smith" {...register('name')} className={inputCls} />
                  </Field>
                  <Field label="Email Address" error={errors.email?.message} monoClass={mono.className}>
                    <input id="email" type="email" placeholder="jane@example.com" {...register('email')} className={inputCls} />
                  </Field>
                </div>

                <Field label="Subject" error={errors.subject?.message} monoClass={mono.className}>
                  <input
                    id="subject"
                    placeholder="e.g. Quote for mechanical prototype"
                    {...register('subject')}
                    className={inputCls}
                  />
                </Field>

                <Field label="Message" error={errors.message?.message} monoClass={mono.className}>
                  <textarea
                    id="message"
                    rows={7}
                    placeholder="Tell us about your project — material preferences, quantity, timeline, any special requirements..."
                    {...register('message')}
                    className={textareaCls}
                  />
                </Field>

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

function Field({
  label, error, children, monoClass,
}: {
  label: string; error?: string; children: React.ReactNode; monoClass: string;
}) {
  return (
    <div className="space-y-2">
      <Label className={`${monoClass} text-[9px] uppercase tracking-[0.22em] text-text-secondary`}>
        {label}
      </Label>
      {children}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}

function SuccessState({
  onReset, mono, display,
}: {
  onReset: () => void; mono: string; display: string;
}) {
  return (
    <div className="h-full flex flex-col items-start justify-center gap-6 py-16">
      <CheckCircle2 className="h-10 w-10 text-accent" strokeWidth={1.5} />
      <div>
        <h3
          className={`${display} text-text-primary leading-[0.88] mb-3`}
          style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}
        >
          MESSAGE<br />SENT<span className="text-accent">.</span>
        </h3>
        <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
          Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.
        </p>
      </div>
      <button
        onClick={onReset}
        className={`${mono} inline-flex items-center gap-2 border border-border text-text-secondary text-[10px] uppercase tracking-[0.2em] px-6 h-9 hover:text-text-primary hover:border-border-strong transition-colors`}
      >
        Send Another
      </button>
    </div>
  );
}