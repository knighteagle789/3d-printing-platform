'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { quotesApi } from '@/lib/api/quotes';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Pending:       'outline',
    UnderReview:   'secondary',
    QuoteProvided: 'default',
    Accepted:      'default',
    Expired:       'destructive',
    Cancelled:     'destructive',
  };
  return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}

export default function QuotesPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const searchParams = useSearchParams();
  const toastShown = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesApi.getMine(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const created = searchParams.get('created');
    if (created && !toastShown.current) {
      toastShown.current = true;
      toast.success('Quote request submitted!', {
        description: 'We\'ll review your request and respond shortly.',
      });
      router.replace('/quotes');
    }
  }, [searchParams, router]);

  if (!isInitialized) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Quotes</h1>
        <p className="text-muted-foreground mt-1">
          Request and track pricing for your 3D printing projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground text-sm py-4">Loading quotes...</p>
          )}
          {isError && (
            <p className="text-destructive text-sm py-4">Failed to load quotes. Please try again.</p>
          )}
          {data && data.data.items.length === 0 && (
            <p className="text-muted-foreground text-sm py-4">
              You haven&apos;t submitted any quote requests yet.
            </p>
          )}
          {data && data.data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.items.map((quote) => (
                  <TableRow
                    key={quote.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/quotes/${quote.id}`)}
                  >
                    <TableCell className="font-medium">{quote.requestNumber}</TableCell>
                    <TableCell>{new Date(quote.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {quote.file?.originalFileName ?? '—'}
                    </TableCell>
                    <TableCell>{quote.quantity}</TableCell>
                    <TableCell><StatusBadge status={quote.status} /></TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/quotes/${quote.id}`);
                        }}
                      >
                        View
                      </Button>
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