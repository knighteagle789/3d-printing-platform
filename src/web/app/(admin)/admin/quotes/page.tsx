'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesApi } from '@/lib/api/quotes';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending:       'outline',
  UnderReview:   'secondary',
  QuoteProvided: 'default',
  Accepted:      'default',
  Expired:       'destructive',
  Cancelled:     'destructive',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function AdminQuotesPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quotes', 'pending'],
    queryFn: () => quotesApi.getPending(),
  });

  const quotes = data?.data.items ?? [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quote Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and respond to customer quote requests
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              No pending quote requests.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Request #</th>
                  <th className="text-left px-4 py-3 font-medium">File</th>
                  <th className="text-left px-4 py-3 font-medium">Material</th>
                  <th className="text-left px-4 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 font-medium">Budget</th>
                  <th className="text-left px-4 py-3 font-medium">Required By</th>
                  <th className="text-left px-4 py-3 font-medium">Submitted</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/admin/quotes/${quote.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{quote.requestNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {quote.file?.originalFileName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {quote.preferredMaterial?.name ?? 'No preference'}
                    </td>
                    <td className="px-4 py-3">{quote.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {quote.budgetDisplay ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {quote.requiredByDate ? formatDate(quote.requiredByDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[quote.status] ?? 'outline'}>
                        {quote.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}