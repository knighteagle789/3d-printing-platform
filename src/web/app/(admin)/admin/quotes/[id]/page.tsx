'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { quotesApi } from '@/lib/api/quotes';
import { materialsApi } from '@/lib/api/materials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Calendar, DollarSign, CheckCircle } from 'lucide-react';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending:       'outline',
  UnderReview:   'secondary',
  QuoteProvided: 'default',
  Accepted:      'default',
  Expired:       'destructive',
  Cancelled:     'destructive',
};

const responseSchema = z.object({
  price:                z.number().min(0.01, 'Price is required'),
  shippingCost:         z.number().min(0).optional(),
  estimatedDays:        z.number().int().min(1, 'Estimated days is required'),
  recommendedMaterialId: z.string().optional(),
  recommendedColor:     z.string().optional(),
  technicalNotes:       z.string().optional(),
  alternativeOptions:   z.string().optional(),
  expiresInDays:        z.number().int().min(1).max(90),
});

type ResponseFormValues = z.infer<typeof responseSchema>;

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quote', id],
    queryFn: () => quotesApi.getById(id),
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
  });

  const form = useForm<ResponseFormValues>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      price:          0,
      estimatedDays:  5,
      expiresInDays:  14,
      shippingCost:   0,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ResponseFormValues) =>
      quotesApi.addResponse(id, {
        price:                 values.price,
        shippingCost:          values.shippingCost,
        estimatedDays:         values.estimatedDays,
        recommendedMaterialId: values.recommendedMaterialId || undefined,
        recommendedColor:      values.recommendedColor || undefined,
        technicalNotes:        values.technicalNotes || undefined,
        alternativeOptions:    values.alternativeOptions || undefined,
        expiresInDays:         values.expiresInDays,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quote', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'quotes'] });
      form.reset({ price: 0, estimatedDays: 5, expiresInDays: 14, shippingCost: 0 });
      toast.success('Quote response sent to customer.');
    },
    onError: () => toast.error('Failed to send quote response.'),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const quote = data?.data;
  if (!quote) return null;

  const materials = materialsData?.data ?? [];
  const canRespond = quote.status !== 'Accepted' && quote.status !== 'Cancelled';

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4"
          onClick={() => router.push('/admin/quotes')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Quotes
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{quote.requestNumber}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Submitted {formatDateTime(quote.createdAt)}
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
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span>{quote.file?.originalFileName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span>{quote.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preferred Material</span>
              <span>{quote.preferredMaterial?.name ?? 'No preference'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preferred Color</span>
              <span>{quote.preferredColor ?? 'No preference'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required By</span>
              <span>{formatDate(quote.requiredByDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span>{quote.budgetDisplay ?? '—'}</span>
            </div>
            {quote.specialRequirements && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Special Requirements</span>
                <p className="mt-1">{quote.specialRequirements}</p>
              </div>
            )}
            {quote.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing responses */}
        {quote.responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Responses Sent ({quote.responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.responses.map((res, i) => (
                <div key={res.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base">${res.price.toFixed(2)}</p>
                        {res.shippingCost != null && (
                          <span className="text-muted-foreground">
                            + ${res.shippingCost.toFixed(2)} shipping
                          </span>
                        )}
                        {res.isAccepted && (
                          <Badge className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Accepted
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        Est. {res.estimatedDays} days
                        {res.recommendedMaterial && ` · ${res.recommendedMaterial.name}`}
                        {res.recommendedColor && ` · ${res.recommendedColor}`}
                      </p>
                      {res.technicalNotes && (
                        <p className="text-muted-foreground italic">{res.technicalNotes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Sent by {res.createdBy?.firstName} {res.createdBy?.lastName} · {formatDateTime(res.createdAt)}
                        · Expires {formatDate(res.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add response form */}
        {canRespond && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Send Quote Response</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                  className="space-y-4"
                >
                  {/* Price + Shipping */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(
                                isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping ($) <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(
                                isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Estimated days + Expires */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimatedDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(
                                isNaN(e.target.valueAsNumber) ? 1 : e.target.valueAsNumber
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expiresInDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offer Expires In (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={90}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(
                                isNaN(e.target.valueAsNumber) ? 14 : e.target.valueAsNumber
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Recommended material + color */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recommendedMaterialId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommended Material <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Same as requested" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {materials.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recommendedColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommended Color <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Black" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Technical notes */}
                  <FormField
                    control={form.control}
                    name="technicalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technical Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any technical details, print considerations, or recommendations..."
                            rows={3}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Sending...' : 'Send Quote Response'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}