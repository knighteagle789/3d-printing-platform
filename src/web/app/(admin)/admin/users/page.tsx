'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { JetBrains_Mono } from 'next/font/google';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';

const mono = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

type FilterType = 'all' | 'active' | 'inactive' | 'admin' | 'staff';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const ROLE_COLOURS: Record<string, string> = {
  Admin:    'bg-amber-400/15 text-amber-400 border-amber-400/20',
  Staff:    'bg-sky-400/15 text-sky-400 border-sky-400/20',
  Customer: 'bg-white/[0.06] text-white/40 border-white/10',
};

export default function AdminUsersPage() {
  const router   = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn:  () => usersApi.getAll(page, 25),
  });

  const all        = data?.data.items ?? [];
  const totalPages = data?.data.totalPages ?? 1;
  const totalCount = data?.data.totalCount ?? 0;

  const counts = {
    all:      totalCount,
    active:   all.filter(u => u.isActive).length,
    inactive: all.filter(u => !u.isActive).length,
    admin:    all.filter(u => u.roles.includes('Admin')).length,
    staff:    all.filter(u => u.roles.includes('Staff')).length,
  };

  const filtered = all
    .filter(u => {
      if (filter === 'active')   return u.isActive;
      if (filter === 'inactive') return !u.isActive;
      if (filter === 'admin')    return u.roles.includes('Admin');
      if (filter === 'staff')    return u.roles.includes('Staff');
      return true;
    })
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)  ||
        u.email.toLowerCase().includes(q)     ||
        (u.companyName ?? '').toLowerCase().includes(q)
      );
    });

  const TABS: { key: FilterType; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'active',   label: 'Active'   },
    { key: 'inactive', label: 'Inactive' },
    { key: 'admin',    label: 'Admin'    },
    { key: 'staff',    label: 'Staff'    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Header ── */}
      <div>
        <h1
          className="font-black tracking-tight leading-[1.1] text-white mb-1.5"
          style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
        >
          Users
        </h1>
        <p className={`${mono.className} text-[9px] uppercase tracking-[0.2em] text-white/25`}>
          {totalCount} total accounts
        </p>
      </div>

      {/* ── Filter tabs + search ── */}
      <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-0">
        <div className="flex items-end gap-0">
          {TABS.map(({ key, label }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => { setFilter(key); setSearch(''); setPage(1); }}
                className={`${mono.className} relative flex items-center gap-1.5 px-4 py-3 text-[9px] uppercase tracking-[0.18em] transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-amber-400 border-amber-400'
                    : 'text-white/30 border-transparent hover:text-white/50'
                }`}
              >
                {label}
                <span className={`text-[8px] px-1 py-0.5 ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-400'
                    : 'bg-white/[0.06] text-white/25'
                }`}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, email, company..."
          className={`${mono.className} h-8 w-56 bg-white/[0.03] border border-white/8 px-3 text-[10px] text-white/60 placeholder:text-white/15 focus:outline-none focus:border-amber-400/40 transition-colors mb-1`}
        />
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="space-y-px">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="h-8 w-8 text-white/10" />
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-white/20`}>
            No users found
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-px bg-white/[0.04]">

          {/* Column headers */}
          <div
            className="grid bg-[#0d0a06] px-4 py-2"
            style={{ gridTemplateColumns: '2fr 2.5fr 1.5fr 1fr 1fr 1fr' }}
          >
            {['Name', 'Email', 'Company', 'Roles', 'Status', 'Joined'].map(h => (
              <p key={h} className={`${mono.className} text-[8px] uppercase tracking-[0.2em] text-white/20`}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(user => (
            <div
              key={user.id}
              onClick={() => router.push(`/admin/users/${user.id}`)}
              className="grid items-center bg-[#0d0a06] px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors group"
              style={{ gridTemplateColumns: '2fr 2.5fr 1.5fr 1fr 1fr 1fr' }}
            >
              {/* Name */}
              <p className={`${mono.className} text-[11px] text-white/80 group-hover:text-white transition-colors`}>
                {user.firstName} {user.lastName}
              </p>

              {/* Email */}
              <p className={`${mono.className} text-[10px] text-white/40 truncate pr-4`}>
                {user.email}
              </p>

              {/* Company */}
              <p className={`${mono.className} text-[10px] text-white/30`}>
                {user.companyName ?? '—'}
              </p>

              {/* Roles */}
              <div className="flex flex-wrap gap-1">
                {user.roles.map(role => (
                  <span
                    key={role}
                    className={`${mono.className} text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 border ${ROLE_COLOURS[role] ?? ROLE_COLOURS.Customer}`}
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Status */}
              <span className={`${mono.className} inline-flex text-[8px] uppercase tracking-[0.15em] px-2 py-1 w-fit ${
                user.isActive
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-white/[0.04] text-white/20'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>

              {/* Joined */}
              <p className={`${mono.className} text-[9px] text-white/25`}>
                {formatDate(user.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.18em] text-white/20`}>
            Page {page} of {totalPages} · {totalCount} users
          </p>
          <div className="flex gap-px">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className={`${mono.className} flex items-center gap-1.5 px-4 h-8 text-[9px] uppercase tracking-[0.15em] border border-white/8 transition-colors ${
                page === 1
                  ? 'text-white/15 cursor-not-allowed'
                  : 'text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className={`${mono.className} flex items-center gap-1.5 px-4 h-8 text-[9px] uppercase tracking-[0.15em] border border-white/8 transition-colors ${
                page === totalPages
                  ? 'text-white/15 cursor-not-allowed'
                  : 'text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}