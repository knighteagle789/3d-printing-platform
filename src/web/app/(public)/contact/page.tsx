'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { contactApi, ContactFormData } from '@/lib/api/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Clock, MapPin } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: ContactFormData) => contactApi.submit(data),
    onSuccess: () => {
      setSubmitted(true);
      reset();
    },
    onError: () => toast.error('Failed to send message. Please try again.'),
  });

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">Get in Touch</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">Contact Us</h1>
          <p className="text-white/50 text-lg mt-4 max-w-xl">
            Have a project in mind? A question about materials? 
            We&apos;re here to help. Expect a response within 1-2 business days.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-16">
          {/* Info */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-6">
                Contact Info
              </p>
              <div className="space-y-6">
                {[
                  {
                    icon: Mail,
                    label: 'Email',
                    value: 'hello@printhub.com',
                    sub: 'We reply within 1-2 business days'
                  },
                  {
                    icon: Clock,
                    label: 'Hours',
                    value: 'Mon–Fri, 8am–6pm MST',
                    sub: 'Closed weekends and holidays'
                  },
                  {
                    icon: MapPin,
                    label: 'Location',
                    value: 'Loveland, Colorado',
                    sub: 'Local pickup available'
                  },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="w-9 h-9 border border-white/10 rounded-lg flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-widest mb-0.5">
                        {item.label}
                      </p>
                      <p className="font-semibold text-sm">{item.value}</p>
                      <p className="text-white/40 text-xs">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-5">
              <p className="font-bold mb-2">Ready to order?</p>
              <p className="text-white/50 text-sm leading-relaxed mb-4">
                Skip the form — create an account and upload your model directly 
                to get an instant estimate.
              </p>
              <Button
                size="sm"
                className="bg-amber-400 text-black hover:bg-amber-300 font-bold w-full"
                asChild
              >
                <a href="/register">Create Free Account</a>
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-3">
            {submitted ? (
              <div className="border border-amber-400/30 rounded-xl p-10 bg-amber-400/5 text-center">
                <div className="text-5xl mb-4">✓</div>
                <h3 className="text-2xl font-black mb-2">Message sent!</h3>
                <p className="text-white/50 mb-6">
                  Thanks for reaching out. We&apos;ll get back to you within 1-2 business days.
                </p>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5"
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
                className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/60 text-xs uppercase tracking-widest">
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Jane Smith"
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-amber-400/50"
                    />
                    {errors.name && (
                      <p className="text-destructive text-xs">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/60 text-xs uppercase tracking-widest">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="jane@example.com"
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-amber-400/50"
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-white/60 text-xs uppercase tracking-widest">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    {...register('subject')}
                    placeholder="e.g. Quote request for mechanical prototype"
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-amber-400/50"
                  />
                  {errors.subject && (
                    <p className="text-destructive text-xs">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white/60 text-xs uppercase tracking-widest">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    {...register('message')}
                    placeholder="Tell us about your project, timeline, or any questions you have..."
                    rows={6}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-amber-400/50 resize-none"
                  />
                  {errors.message && (
                    <p className="text-destructive text-xs">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={mutation.isPending}
                  className="w-full bg-amber-400 text-black hover:bg-amber-300 font-bold h-12"
                >
                  {mutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}