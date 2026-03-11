'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { materialsApi } from '@/lib/api/materials';
import { ordersApi } from '@/lib/api/orders';
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

const orderSchema = z.object({
  materialId:           z.string().min(1, 'Please select a material'),
  quantity:             z.number().int().min(1, 'Quantity must be at least 1'),
  quality:              z.string().min(1, 'Please select a quality'),
  infill:               z.number().min(5).max(100).optional(),
  supportStructures:    z.boolean(),
  specialInstructions:  z.string().optional(),
  shippingAddress:      z.string().min(1, 'Shipping address is required'),
  notes:                z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const QUALITY_OPTIONS = [
  { value: 'Draft',    label: 'Draft (0.3mm) — Fastest'       },
  { value: 'Standard', label: 'Standard (0.2mm) — Recommended' },
  { value: 'High',     label: 'High (0.1mm) — Best finish'     },
];

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const { isAuthenticated, isInitialized } = useRequireAuth();

  // Load the uploaded file info
  const { data: fileData } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => filesApi.getById(fileId!),
    enabled: !!fileId && isAuthenticated,
  });

  // Load materials for the dropdown
  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
    enabled: isAuthenticated,
  });

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 1,
      quality: 'Standard',
      infill: 20,
      supportStructures: false,
    },
  });

  const selectedMaterialId = form.watch('materialId');
  const selectedMaterial = materialsData?.data.find(
    (m) => m.id === selectedMaterialId
  );

  const onSubmit = async (values: OrderFormValues) => {
    if (!fileId) return;
    try {
      const response = await ordersApi.create({
        notes: values.notes,
        shippingAddress: values.shippingAddress,
        items: [{
          fileId,
          materialId: values.materialId,
          quantity: values.quantity,
          color: selectedMaterial?.color ?? '',
          specialInstructions: values.specialInstructions,
          quality: values.quality,
          infill: values.infill,
          supportStructures: values.supportStructures,
        }],
      });
      router.push(`/orders?created=${response.data.id}`);
    } catch {
      form.setError('root', { message: 'Failed to place order. Please try again.' });
    }
  };

  if (!isInitialized) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Place an Order</h1>
        <p className="text-muted-foreground mt-1">
          Configure your print settings and submit your order
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

          {/* Material */}
          <Card>
            <CardHeader><CardTitle className="text-base">Material</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="materialId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materialsData?.data.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.type} — {m.color} - ${m.pricePerGram.toFixed(3)}/g
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Print settings */}
          <Card>
            <CardHeader><CardTitle className="text-base">Print Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
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
                  name="infill"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Infill %</FormLabel>
                      <FormControl>
                        <Input type="number" min={5} max={100} {...field} onChange={e => field.onChange(isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUALITY_OPTIONS.map((q) => (
                          <SelectItem key={q.value} value={q.value}>
                            {q.label}
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
                name="supportStructures"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Include support structures</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Instructions <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any specific requirements for this print..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader><CardTitle className="text-base">Delivery</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="shippingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your full shipping address..."
                        {...field}
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
                    <FormLabel>Order Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anything else we should know..."
                        {...field}
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
              {form.formState.isSubmitting ? 'Placing order...' : 'Place Order'}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}