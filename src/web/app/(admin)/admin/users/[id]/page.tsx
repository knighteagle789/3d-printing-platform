'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { ordersApi } from '@/lib/api/orders';
import { quotesApi } from '@/lib/api/quotes';
import { JetBrains_Mono } from 'next/font/google';
import {
  ArrowLeft,
  Calendar, ShoppingBag, MessageSquare, AlertTriangle,
  CheckCircle2, AlertCircle,
} from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

const ALL_ROLES = ['Customer', 'Staff', 'Admin'] as const;

// Active role button colours — solid fills
const ROLE_ACTIVE_COLOURS: Record<string, string> = {
  Admin:    'bg-accent text-white border-accent',
  Staff:    'bg-sky-500 text-white border-sky-500',
  Customer: 'bg-text-primary text-white border-text-primary',
};

// Inactive role button colours — subtle tints
const ROLE_INACTIVE_COLOURS: Record<string, string> = {
  Admin:    'bg-accent-light text-accent border-accent/30 hover:border-accent/60',
  Staff:    'bg-sky-50 text-sky-600 border-sky-200 hover:border-sky-400',
  Customer: 'bg-surface-alt text-text-secondary border-border hover:border-border-strong',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${mono.className} text-[8px] uppercase tracking-[0.22em] text-text-muted pb-2 border-b border-border`}>
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-text-muted`}>
        {label}
      </p>
      <p className={`${mono.className} text-[10px] text-text-secondary`}>
        {value}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }        = use(params);
  const router        = useRouter();
  const queryClient   = useQueryClient();

  const [toast,         setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deactivateArm, setDeactivateArm] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Data ──
  const { data: userData, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn:  () => usersApi.getById(id),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['admin', 'user-orders', id],
    queryFn:  () => ordersApi.getAll({ userId: id, pageSize: 100 }),
    enabled:  true,
  });

  const { data: quotesData } = useQuery({
    queryKey: ['admin', 'user-quotes', id],
    queryFn:  () => quotesApi.getAll({ userId: id, pageSize: 100 }),
    enabled:  true,
  });

  const orderCount = ordersData?.data?.items?.length ?? '—';
  const quoteCount = quotesData?.data?.items?.length ?? '—';

  // ── Mutations ──
  const rolesMutation = useMutation({
    mutationFn: (roles: string[]) => usersApi.updateRoles(id, roles),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast('success', 'Roles updated.');
    },
    onError: () => showToast('error', 'Failed to update roles.'),
  });

  const activeMutation = useMutation({
    mutationFn: (isActive: boolean) => usersApi.setActive(id, isActive),
    onSuccess:  (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeactivateArm(false);
      showToast('success', res.data.isActive ? 'Account reactivated.' : 'Account deactivated.');
    },
    onError: () => showToast('error', 'Failed to update account status.'),
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-surface-alt animate-pulse" />
        ))}
      </div>
    );
  }

  const user = userData?.data;
  if (!user) return null;

  const toggleRole = (role: string) => {
    const updated = user.roles.includes(role)
      ? user.roles.filter(r => r !== role)
      : [...user.roles, role];

    if (updated.length === 0) {
      showToast('error', 'User must have at least one role.');
      return;
    }
    rolesMutation.mutate(updated);
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle   className="h-3.5 w-3.5 shrink-0" />}
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
            {toast.msg}
          </p>
        </div>
      )}

      {/* ── Back ── */}
      <button
        onClick={() => router.push('/admin/users')}
        className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-text-primary transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Users
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-black tracking-tight leading-[1.1] text-text-primary mb-1.5"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            {user.firstName} {user.lastName}
          </h1>
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-text-muted`}>
            {user.email}
          </p>
        </div>
        <span className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border ${
          user.isActive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-surface-alt text-text-muted border-border'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-px bg-border">
        {[
          { icon: ShoppingBag,   label: 'Orders', value: orderCount },
          { icon: MessageSquare, label: 'Quotes', value: quoteCount },
          { icon: Calendar,      label: 'Joined', value: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-surface px-4 py-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="h-3 w-3 text-text-muted" />
              <p className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-text-muted`}>{label}</p>
            </div>
            <p className={`${mono.className} text-[15px] font-semibold text-text-primary`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Account details ── */}
      <div className="space-y-3">
        <SectionLabel>Account Details</SectionLabel>
        <div className="bg-surface border border-border px-4 py-1">
          <InfoRow label="Email"   value={<a href={`mailto:${user.email}`} className="text-accent hover:underline">{user.email}</a>} />
          {user.phoneNumber  && <InfoRow label="Phone"   value={user.phoneNumber} />}
          {user.companyName  && <InfoRow label="Company" value={user.companyName} />}
          <InfoRow label="Member Since" value={formatDate(user.createdAt)} />
          <InfoRow label="User ID"      value={<span className="text-text-muted text-[9px]">{user.id}</span>} />
        </div>
      </div>

      {/* ── Roles ── */}
      <div className="space-y-3">
        <SectionLabel>Roles</SectionLabel>
        <p className={`${mono.className} text-[9px] text-text-muted`}>
          Click to toggle. User must always retain at least one role.
        </p>
        <div className="flex gap-2">
          {ALL_ROLES.map(role => {
            const hasRole = user.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                disabled={rolesMutation.isPending}
                onClick={() => toggleRole(role)}
                className={`${mono.className} text-[9px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors disabled:opacity-40 ${
                  hasRole
                    ? ROLE_ACTIVE_COLOURS[role]
                    : ROLE_INACTIVE_COLOURS[role]
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Account status ── */}
      <div className="space-y-3">
        <SectionLabel>Account Status</SectionLabel>

        {!user.isActive && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 px-4 py-3">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className={`${mono.className} text-[9px] text-red-600 leading-relaxed`}>
              This account is deactivated — the user cannot log in or place orders.
            </p>
          </div>
        )}

        {user.isActive ? (
          deactivateArm ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className={`${mono.className} text-[9px] text-red-600 flex-1`}>
                Deactivate this account? The user will be unable to log in.
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setDeactivateArm(false)}
                  className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary transition-colors`}
                >
                  Cancel
                </button>
                <button
                  disabled={activeMutation.isPending}
                  onClick={() => activeMutation.mutate(false)}
                  className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-40`}
                >
                  {activeMutation.isPending ? 'Deactivating...' : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeactivateArm(true)}
              className={`${mono.className} text-[9px] uppercase tracking-[0.18em] px-4 py-2 border border-danger/20 text-danger/70 hover:text-danger hover:border-danger/40 transition-colors`}
            >
              Deactivate Account
            </button>
          )
        ) : (
          <button
            disabled={activeMutation.isPending}
            onClick={() => activeMutation.mutate(true)}
            className={`${mono.className} text-[9px] uppercase tracking-[0.18em] px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40`}
          >
            {activeMutation.isPending ? 'Reactivating...' : 'Reactivate Account'}
          </button>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="space-y-3">
        <SectionLabel>Activity</SectionLabel>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/orders?userId=${user.id}`)}
            className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] px-4 py-2 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors`}
          >
            <ShoppingBag className="h-3 w-3" /> View Orders
          </button>
          <button
            onClick={() => router.push(`/admin/quotes?userId=${user.id}`)}
            className={`${mono.className} inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] px-4 py-2 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors`}
          >
            <MessageSquare className="h-3 w-3" /> View Quotes
          </button>
        </div>
      </div>

    </div>
  );
}