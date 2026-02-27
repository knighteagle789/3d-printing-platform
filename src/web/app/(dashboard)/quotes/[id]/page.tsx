'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesApi } from '@/lib/api/quotes';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, Calendar, MessageSquare } from 'lucide-react';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending:       'outline',
  UnderReview:   'secondary',
  QuoteProvided: 'default',
  Accepted:      'default',
  Expired:       'destructive',
  Cancelled:     'destructive',
};

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quotesApi.getById(id),
    enabled: isAuthenticated,
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
        <p className="text-destructive">Quote request not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/quotes')}>
          Back to Quotes
        </Button>
      </div>
    );
  }

  const quote = data.data;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => router.push('/quotes')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Quotes
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{quote.requestNumber}</h1>
            <p className="text-muted-foreground mt-1">
              Submitted {formatDate(quote.createdAt)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[quote.status] ?? 'outline'} className="text-sm px-3 py-1">
            {quote.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Request details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {quote.file && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">File</span>
                <span>{quote.file.originalFileName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span>{quote.quantity}</span>
            </div>
            {quote.preferredMaterial && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preferred material</span>
                <span>{quote.preferredMaterial.name}</span>
              </div>
            )}
            {quote.preferredColor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preferred color</span>
                <span>{quote.preferredColor}</span>
              </div>
            )}
            {quote.budgetDisplay && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span>{quote.budgetDisplay}</span>
              </div>
            )}
            {quote.specialRequirements && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Special requirements</span>
                <span className="text-right max-w-[60%]">{quote.specialRequirements}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{formatDate(quote.createdAt)}</span>
            </div>
            {quote.requiredByDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required by</span>
                <span>{formatDate(quote.requiredByDate)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing responses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Pricing Responses ({quote.responses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quote.responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pricing responses yet. We&apos;ll review your request and respond shortly.
              </p>
            ) : (
              <div className="space-y-4">
                {quote.responses.map((response, index) => (
                  <div key={response.id}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className={`rounded-md text-sm space-y-2 ${response.isAccepted ? 'text-primary' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">
                          ${response.price.toFixed(2)}
                        </span>
                        {response.isAccepted && <Badge>Accepted</Badge>}
                      </div>
                      {response.shippingCost != null && (
                        <p className="text-muted-foreground">
                          + ${response.shippingCost.toFixed(2)} shipping
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        Estimated {response.estimatedDays} days
                      </p>
                      {response.recommendedMaterial && (
                        <p className="text-muted-foreground">
                          Recommended material: {response.recommendedMaterial.name}
                        </p>
                      )}
                      {response.technicalNotes && (
                        <p>{response.technicalNotes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Expires {formatDate(response.expiresAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{quote.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}