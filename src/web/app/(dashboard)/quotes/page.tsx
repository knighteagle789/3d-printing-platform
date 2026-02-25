'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { quotesApi, QuoteRequest } from '@/lib/api/quotes';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Pending:       'outline',
    UnderReview:   'secondary',
    QuoteProvided: 'default',
    Accepted:      'default',
    Expired:       'destructive',
    Cancelled:     'destructive',
  };

  return (
    <Badge variant={variants[status] ?? 'outline'}>
      {status}
    </Badge>
  );
}

function QuoteDetailDialog({
  quote,
  open,
  onClose,
}: {
  quote: QuoteRequest | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quote {quote.requestNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quote details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={quote.status} />

            <span className="text-muted-foreground">Quantity</span>
            <span>{quote.quantity}</span>

            {quote.file && (
              <>
                <span className="text-muted-foreground">File</span>
                <span className="truncate">{quote.file.originalFileName}</span>
              </>
            )}

            {quote.preferredMaterial && (
              <>
                <span className="text-muted-foreground">Material</span>
                <span>{quote.preferredMaterial.name}</span>
              </>
            )}

            {quote.budgetDisplay && (
              <>
                <span className="text-muted-foreground">Budget</span>
                <span>{quote.budgetDisplay}</span>
              </>
            )}

            {quote.requiredByDate && (
              <>
                <span className="text-muted-foreground">Required by</span>
                <span>
                  {new Date(quote.requiredByDate).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          {/* Pricing responses */}
          {quote.responses.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Pricing Responses</h4>
              <div className="space-y-2">
                {quote.responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-3 rounded-md border text-sm space-y-1
                      ${response.isAccepted ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-base">
                        ${response.price.toFixed(2)}
                        {response.shippingCost != null && (
                          <span className="text-muted-foreground text-xs ml-1">
                            + ${response.shippingCost.toFixed(2)} shipping
                          </span>
                        )}
                      </span>
                      {response.isAccepted && (
                        <Badge>Accepted</Badge>
                      )}
                    </div>

                    <p className="text-muted-foreground">
                      Estimated {response.estimatedDays} days
                    </p>

                    {response.technicalNotes && (
                      <p className="text-muted-foreground">
                        {response.technicalNotes}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(response.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quote.responses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No pricing responses yet. We&apos;ll review your request and respond shortly.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuotesPage() {
  const { isAuthenticated, isInitialized } = useRequireAuth();
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesApi.getMine(),
    enabled: isAuthenticated,
  });

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
            <p className="text-muted-foreground text-sm py-4">
              Loading quotes...
            </p>
          )}

          {isError && (
            <p className="text-destructive text-sm py-4">
              Failed to load quotes. Please try again.
            </p>
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
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      {quote.requestNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {quote.file?.originalFileName ?? '—'}
                    </TableCell>
                    <TableCell>{quote.quantity}</TableCell>
                    <TableCell>
                      <StatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedQuote(quote)}
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

      <QuoteDetailDialog
        quote={selectedQuote}
        open={selectedQuote !== null}
        onClose={() => setSelectedQuote(null)}
      />
    </div>
  );
}