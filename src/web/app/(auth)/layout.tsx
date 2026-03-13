'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Redirect already-authenticated users away from auth pages
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/orders');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Render nothing while we check auth state to avoid a flash of the form
  if (!isInitialized) return null;
  if (isAuthenticated) return null;

  return <>{children}</>;
}