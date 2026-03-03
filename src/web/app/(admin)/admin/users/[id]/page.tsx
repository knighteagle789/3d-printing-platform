'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

const ALL_ROLES = ['Customer', 'Staff', 'Admin'];

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  Admin: 'default',
  Staff: 'secondary',
  Customer: 'outline',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => usersApi.getById(id),
  });

  const rolesMutation = useMutation({
    mutationFn: (roles: string[]) => usersApi.updateRoles(id, roles),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(`Roles updated for ${res.data.firstName} ${res.data.lastName}`);
    },
    onError: () => toast.error('Failed to update roles.'),
  });

  const activeMutation = useMutation({
    mutationFn: (isActive: boolean) => usersApi.setActive(id, isActive),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(res.data.isActive ? 'User reactivated.' : 'User deactivated.');
    },
    onError: () => toast.error('Failed to update user status.'),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const user = data?.data;
  if (!user) return null;

  const toggleRole = (role: string) => {
    const current = user.roles;
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];

    // Always keep at least Customer role
    if (updated.length === 0) {
      toast.error('User must have at least one role.');
      return;
    }

    rolesMutation.mutate(updated);
  };

  return (
    <div className="p-6 max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6"
        onClick={() => router.push('/admin/users')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
        </div>
        <Badge variant={user.isActive ? 'default' : 'destructive'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            {user.phoneNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{user.phoneNumber}</span>
              </div>
            )}
            {user.companyName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company</span>
                <span>{user.companyName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Click a role to toggle it on or off. Users must have at least one role.
            </p>
            <div className="flex gap-3">
              {ALL_ROLES.map((role) => {
                const hasRole = user.roles.includes(role);
                return (
                  <button
                    key={role}
                    disabled={rolesMutation.isPending}
                    onClick={() => toggleRole(role)}
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors
                      ${hasRole
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                      }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Account status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {user.isActive
                ? 'This account is active and the user can log in.'
                : 'This account is deactivated. The user cannot log in.'}
            </p>
            <Button
              variant={user.isActive ? 'outline' : 'default'}
              size="sm"
              disabled={activeMutation.isPending}
              onClick={() => {
                const action = user.isActive ? 'deactivate' : 'reactivate';
                if (confirm(`Are you sure you want to ${action} this account?`)) {
                  activeMutation.mutate(!user.isActive);
                }
              }}
            >
              {activeMutation.isPending
                ? 'Updating...'
                : user.isActive ? 'Deactivate Account' : 'Reactivate Account'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}