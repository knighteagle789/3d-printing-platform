'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api/auth';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { User, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono  = JetBrains_Mono({ weight: ['400', '500'], subsets: ['latin'] });

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName:   z.string().min(1, 'First name is required'),
  lastName:    z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  companyName: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileFormValues  = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ── Shared primitives ─────────────────────────────────────────────────────────

const inputCls = `w-full h-9 bg-surface-alt border border-border px-3 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors`;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className={`${mono.className} block text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1.5`}>
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={`${mono.className} text-[8px] text-red-400 mt-1`}>{msg}</p>;
}

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface" >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <Icon className="h-3.5 w-3.5 text-text-muted" />
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Toast({ type, msg, onDismiss }: { type: 'success' | 'error'; msg: string; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 border text-[10px] mb-4 ${mono.className} ${
        type === 'success'
          ? 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-700'
          : 'border-red-400/20 bg-red-400/[0.04] text-red-600'
      }`}
    >
      {type === 'success'
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        : <AlertCircle   className="h-3.5 w-3.5 shrink-0" />
      }
      {msg}
    </div>
  );
}

// ── Profile form ──────────────────────────────────────────────────────────────

function ProfileForm({ user }: {
  user: { firstName: string; lastName: string; phoneNumber?: string | null; companyName?: string | null };
}) {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ProfileFormValues>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
        firstName:   user.firstName,
        lastName:    user.lastName,
        phoneNumber: user.phoneNumber ?? '',
        companyName: user.companyName ?? '',
      },
    });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormValues) => authApi.updateProfile(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      const token = localStorage.getItem('auth_token') ?? '';
      setAuth(res.data, token);
      setToast({ type: 'success', msg: 'Profile updated.' });
    },
    onError: () => setToast({ type: 'error', msg: 'Failed to update profile — please try again.' }),
  });

  return (
    <Section icon={User} title="Profile">
      {toast && <Toast type={toast.type} msg={toast.msg} onDismiss={() => setToast(null)} />}
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>First Name</FieldLabel>
            <input className={`${inputCls} ${mono.className}`} {...register('firstName')} />
            <FieldError msg={errors.firstName?.message} />
          </div>
          <div>
            <FieldLabel>Last Name</FieldLabel>
            <input className={`${inputCls} ${mono.className}`} {...register('lastName')} />
            <FieldError msg={errors.lastName?.message} />
          </div>
        </div>

        <div>
          <FieldLabel>Phone Number</FieldLabel>
          <input
            className={`${inputCls} ${mono.className}`}
            placeholder="+1 (555) 000-0000"
            {...register('phoneNumber')}
          />
        </div>

        <div>
          <FieldLabel>Company Name</FieldLabel>
          <input
            className={`${inputCls} ${mono.className}`}
            placeholder="Your company (optional)"
            {...register('companyName')}
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className={`${mono.className} h-9 px-6 bg-amber-500 border border-amber-400/30 text-[9px] uppercase tracking-[0.15em] text-amber-700 hover:bg-amber-500 hover:text-accent transition-colors disabled:opacity-40`}
          >
            {isSubmitting || mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ── Password form ─────────────────────────────────────────────────────────────

function PasswordForm() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation({
    mutationFn: (data: PasswordFormValues) =>
      authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      reset();
      setToast({ type: 'success', msg: 'Password changed.' });
    },
    onError: () => setToast({ type: 'error', msg: 'Incorrect current password.' }),
  });

  return (
    <Section icon={Lock} title="Change Password">
      {toast && <Toast type={toast.type} msg={toast.msg} onDismiss={() => setToast(null)} />}
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
        <div>
          <FieldLabel>Current Password</FieldLabel>
          <input type="password" className={`${inputCls} ${mono.className}`} {...register('currentPassword')} />
          <FieldError msg={errors.currentPassword?.message} />
        </div>

        <div>
          <FieldLabel>New Password</FieldLabel>
          <input type="password" className={`${inputCls} ${mono.className}`} {...register('newPassword')} />
          <FieldError msg={errors.newPassword?.message} />
        </div>

        <div>
          <FieldLabel>Confirm New Password</FieldLabel>
          <input type="password" className={`${inputCls} ${mono.className}`} {...register('confirmPassword')} />
          <FieldError msg={errors.confirmPassword?.message} />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className={`${mono.className} h-9 px-6 bg-surface-alt border border-border text-[9px] uppercase tracking-[0.15em] text-text-secondary hover:text-text-secondary hover:border-border transition-colors disabled:opacity-40`}
          >
            {isSubmitting || mutation.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const { user: storeUser } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authApi.me(),
    enabled:  isAuthenticated,
  });

  if (!isInitialized || !isAuthenticated) return null;

  const user = data?.data ?? storeUser;

  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-amber-700 mb-2`}>
          Account
        </p>
        <h1 className={`${bebas.className} text-4xl text-text-primary tracking-wide`}>
          Profile
        </h1>
        <p className={`${mono.className} text-[11px] text-text-muted mt-1`}>
          Manage your account details and security
        </p>
      </div>

      {/* Roles chip */}
      {storeUser?.roles && storeUser.roles.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-text-muted" />
          <div className="flex gap-1.5">
            {storeUser.roles.map(role => (
              <span
                key={role}
                className={`${mono.className} text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 border ${
                  role === 'Admin'
                    ? 'border-amber-400/30 text-amber-700'
                    : role === 'Staff'
                    ? 'border-sky-400/30 text-sky-700'
                    : 'border-border text-text-muted'
                }`}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="h-40 bg-surface-alt animate-pulse" />
          <div className="h-40 bg-surface-alt animate-pulse" />
        </div>
      )}

      {!isLoading && user && (
        <div className="space-y-4">
          <ProfileForm user={user as { firstName: string; lastName: string; phoneNumber?: string | null; companyName?: string | null }} />
          <PasswordForm />
        </div>
      )}
    </div>
  );
}