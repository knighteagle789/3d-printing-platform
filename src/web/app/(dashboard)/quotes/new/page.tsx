'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { materialsApi } from '@/lib/api/materials';
import { quotesApi } from '@/lib/api/quotes';
import { filesApi } from '@/lib/api/files';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const quoteSchema = z.object({
  quantity:               z.number().int().min(1, 'Quantity must be at least 1'),
  preferredMaterialId:    z.string().optional(),
  preferredColor:         z.string().optional(),
  requiredByDate:         z.string().optional(),
  specialRequirements:    z.string().optional(),
  notes:                  z.string().optional(),
  budgetMin:              z.number().min(0).optional(),
  budgetMax:              z.number().min(0).optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const { isAuthenticated, isInitialized } = useRequireAuth();

  const { data: fileData } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => filesApi.getById(fileId!),
    enabled: !!fileId && isAuthenticated,
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
    enabled: isAuthenticated,
  });

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { quantity: 1 },
  });

  const selectedMaterialId = form.watch('preferredMaterialId');
  const selectedMaterial = materialsData?.data.find(
    (m) => m.id === selectedMaterialId
  );

  const onSubmit = async (values: QuoteFormValues) => {
    try {
      const response = await quotesApi.create({
        fileId:              fileId ?? undefined,
        quantity:            values.quantity,
        preferredMaterialId: values.preferredMaterialId,
        preferredColor:      values.preferredColor,
        requiredByDate:      values.requiredByDate,
        specialRequirements: values.specialRequirements,
        notes:               values.notes,
        budgetMin:           values.budgetMin,
        budgetMax:           values.budgetMax,
      });
      router.push(`/quotes?created=${response.data.id}`);
    } catch {
      form.setError('root', { message: 'Failed to submit quote request. Please try again.' });
    }
  };

  if (!isInitialized) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Request a Quote</h1>
        <p className="text-muted-foreground mt-1">
          Tell us about your project and we will get back to you with pricing
        </p>
      </div>

      {/* File summary */}
      {fileData && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">File</span>
              <span className="font-medium">{fileData.data.originalFileName}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Size</span>
              <span>{(fileData.data.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Preferences */}
          <Card>
            <CardHeader><CardTitle className="text-base">Print Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={e => field.onChange(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredMaterialId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Material <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materialsData?.data.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.type} — {m.color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredByDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required By <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader><CardTitle className="text-base">Budget <span className="text-muted-foreground font-normal text-sm">(optional)</span></CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budgetMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          placeholder="0.00" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budgetMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          placeholder="0.00" 
                          {...field} 
                          value={field.value ?? ''}
                          onChange={e => field.onChange(isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="specialRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requirements <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any specific technical requirements..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anything else you'd like us to know..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}