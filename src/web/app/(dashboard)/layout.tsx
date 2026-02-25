'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { Navbar } from '@/components/layout/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, setAuth } = useAuthStore();

  useEffect(() => {
    // If we have a token but no user (e.g. after page refresh),
    // fetch the current user from the API to repopulate the store
    if (token && !user) {
      authApi.me().then((response) => {
        setAuth(response.data, token);
      }).catch(() => {
        // Token is invalid — clearAuth will be handled by the 401 interceptor
      });
    }
  }, [token, user, setAuth]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {children}
      </main>
    </div>
  );
}