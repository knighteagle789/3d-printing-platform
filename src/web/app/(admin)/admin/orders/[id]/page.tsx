'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Package, Calendar, MapPin, Clock } from 'lucide-react';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline', Submitted: 'secondary', InReview: 'secondary',
  Approved: 'default', InProduction: 'default', Printing: 'default',
  PostProcessing: 'default', QualityCheck: 'default', Packaging: 'default',
  Shipped: 'default', Delivered: 'default', Completed: 'default',
  Cancelled: 'destructive', OnHold: 'secondary', QuoteProvided: 'secondary',
};

// Valid transitions matching backend logic
const NEXT_STATUSES: Record<string, string[]> = {
  Draft:          ['Submitted', 'Cancelled'],
  Submitted:      ['InReview', 'Cancelled'],
  InReview:       ['QuoteProvided', 'Approved', 'Cancelled', 'OnHold'],
  QuoteProvided:  ['Approved', 'Cancelled'],
  Approved:       ['InProduction', 'Cancelled', 'OnHold'],
  InProduction:   ['Printing', 'OnHold'],
  Printing:       ['PostProcessing', 'OnHold'],
  PostProcessing: ['QualityCheck'],
  QualityCheck:   ['Packaging', 'Printing'],
  Packaging:      ['Shipped'],
  Shipped:        ['Delivered'],
  Delivered:      ['Completed'],
  OnHold:         ['InReview', 'Approved', 'InProduction', 'Cancelled'],
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => ordersApi.getById(id),
  });

  const mutation = useMutation({
    mutationFn: () => ordersApi.updateStatus(id, newStatus, notes || undefined),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setNewStatus('');
      setNotes('');
      toast.success(`Order moved to ${res.data.status}`);
    },
    onError: () => toast.error('Failed to update status.'),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded" />)}
      </div>
    );
  }

  const order = data?.data;
  if (!order) return null;

  const availableTransitions = NEXT_STATUSES[order.status] ?? [];

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Orders
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {order.user?.firstName} {order.user?.lastName} · {order.user?.email}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[order.status] ?? 'outline'} className="text-sm px-3 py-1">
            {order.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status update */}
        {availableTransitions.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select next status..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Add a note (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
              <Button
                disabled={!newStatus || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">{item.file?.originalFileName ?? 'Unknown file'}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.material?.name} · {item.quality} · {item.infill ?? 20}% infill
                    </p>
                    {item.color && <p className="text-sm text-muted-foreground">Color: {item.color}</p>}
                    {item.estimatedWeight && (
                      <p className="text-sm text-muted-foreground">Est. weight: {item.estimatedWeight.toFixed(1)}g</p>
                    )}
                    {item.specialInstructions && (
                      <p className="text-sm italic text-muted-foreground">&quot;{item.specialInstructions}&quot;</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${order.totalPrice.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Dates
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

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{order.shippingAddress}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusHistory orderId={id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusHistory({ orderId }: { orderId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'order', orderId, 'history'],
    queryFn: () => ordersApi.getHistory(orderId),
  });

  if (isLoading) return <div className="h-16 bg-muted animate-pulse rounded" />;

  const history = data?.data ?? [];

  return (
    <div className="space-y-3">
      {history.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
            {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-3">
            <p className="font-medium">{entry.status}</p>
            {entry.notes && <p className="text-muted-foreground">{entry.notes}</p>}
            <p className="text-muted-foreground text-xs mt-0.5">
              {new Date(entry.changedAt).toLocaleString()} 
              {entry.changedBy && ` · ${entry.changedBy.firstName} ${entry.changedBy.lastName}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}