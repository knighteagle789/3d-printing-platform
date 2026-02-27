'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Maps order status to a badge colour
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Draft:         'outline',
    Submitted:     'secondary',
    InReview:      'secondary',
    Approved:      'default',
    InProduction:  'default',
    Printing:      'default',
    Shipped:       'default',
    Completed:     'default',
    Cancelled:     'destructive',
  };

  return (
    <Badge variant={variants[status] ?? 'outline'}>
      {status}
    </Badge>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastShown = useRef(false);

  useEffect(() => {
    const created = searchParams.get('created');
    if (created && !toastShown.current) {
      toastShown.current = true; // prevent showing toast multiple times
      toast.success('Order created successfully!', {
        description: 'Your order has been placed and is now being processed.',
      });
      // Clean up the URL without triggering a navigation
      router.replace('/orders');
    }
  }, [searchParams, router]);

  const { isAuthenticated, isInitialized } = useRequireAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMine(),
    enabled: isAuthenticated, // don't fetch until we know user is logged in
  });

  if (!isInitialized) return null; // still initializing, render nothing
  if (!isAuthenticated) return null; // redirecting, render nothing

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your 3D printing orders
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground text-sm py-4">
              Loading orders...
            </p>
          )}

          {isError && (
            <p className="text-destructive text-sm py-4">
              Failed to load orders. Please try again.
            </p>
          )}

          {data && data.data.items.length === 0 && (
            <p className="text-muted-foreground text-sm py-4">
              You haven&apos;t placed any orders yet.
            </p>
          )}

          {data && data.data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.items.map((order) => (
                  <TableRow 
                      key={order.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/orders/${order.id}`)} >
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{order.items.length}</TableCell>
                    <TableCell>${order.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}