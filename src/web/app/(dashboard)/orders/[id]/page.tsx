'use client';

import { use, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, MapPin, Calendar, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft:        'outline',
  Submitted:    'secondary',
  InReview:     'secondary',
  Approved:     'default',
  Printing:     'default',
  QualityCheck: 'default',
  Shipped:      'default',
  Completed:    'default',
  Cancelled:    'destructive',
};

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// function formatDateTime(dateString: string | null) {
//   if (!dateString) return '—';
//   return new Date(dateString).toLocaleString('en-US', {
//     year: 'numeric', month: 'short', day: 'numeric',
//     hour: '2-digit', minute: '2-digit',
//   });
// }

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
    enabled: isAuthenticated,
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('Payment successful! Your order has been approved.');
    } else if (payment === 'cancelled') {
      toast.info('Payment cancelled. You can try again when ready.');
    }
  }, [searchParams]);

  const payMutation = useMutation({
    mutationFn: () => ordersApi.createPaymentSession(id),
    onSuccess: (res) => {
      window.location.href = res.data.url;
    },
    onError: () => toast.error('Failed to start checkout. Please try again.'),
  });

  if (!isInitialized) return null;
  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <p className="text-destructive">Order not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const order = data.data;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => router.push('/orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
            <p className="text-muted-foreground mt-1">
              Placed {formatDate(order.createdAt)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[order.status] ?? 'outline'} className="text-sm px-3 py-1">
            {order.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Payment Section */}
        {order.status === 'Submitted' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Payment Required</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete your payment to approve this order and begin production.
                  </p>
                  <p className="text-lg font-bold mt-2">${order.totalPrice.toFixed(2)}</p>
                </div>
                <Button
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {payMutation.isPending ? 'Redirecting...' : 'Pay Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {order.status === 'Approved' && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <p className="font-semibold text-green-700 dark:text-green-400">
                ✓ Payment confirmed — your order is approved and entering production
              </p>
            </CardContent>
          </Card>
        )}        
        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, index) => (
              <div key={item.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.file?.originalFileName ?? 'Unknown file'}
                    </p>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>Material: {item.material?.name ?? '—'}</p>
                      <p>Quality: {item.quality} · Infill: {item.infill ?? '—'}%</p>
                      {item.color && <p>Color: {item.color}</p>}
                      {item.supportStructures && <p>Support structures included</p>}
                      {item.estimatedWeight && (
                        <p>Est. weight: {item.estimatedWeight.toFixed(1)}g</p>
                      )}
                      {item.specialInstructions && (
                        <p className="italic">&quot;{item.specialInstructions}&quot;</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pricing summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}</span>
              </div>
              {order.shippingCost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              {order.tax != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{order.shippingAddress}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordered</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.requiredByDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Required by</span>
                  <span>{formatDate(order.requiredByDate)}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipped</span>
                  <span>{formatDate(order.shippedAt)}</span>
                </div>
              )}
              {order.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{formatDate(order.completedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}