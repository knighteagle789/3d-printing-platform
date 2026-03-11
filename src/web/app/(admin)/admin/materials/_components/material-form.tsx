'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  MATERIAL_TYPES, MATERIAL_FINISHES, MATERIAL_GRADES,
  type MaterialFinish, type MaterialGrade,
} from '@/lib/api/materials';
import { technologiesApi } from '@/lib/api/technologies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const materialSchema = z.object({
  type:                   z.string().min(1, 'Type is required'),
  color:                  z.string().min(1, 'Color is required'),
  finish:                 z.string().optional(),
  grade:                  z.string().optional(),
  description:            z.string().optional(),
  brand:                  z.string().optional(),
  pricePerGram:           z.number().min(0.0001, 'Price must be greater than 0'),
  stockGrams:             z.number().min(0, 'Stock cannot be negative'),
  lowStockThresholdGrams: z.number().min(0).optional(),
  notes:                  z.string().optional(),
  printSettings:          z.string().optional(),
  printingTechnologyId:   z.string().optional(),
  isActive:               z.boolean(),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  defaultValues?: Partial<MaterialFormValues>;
  onSubmit: (values: MaterialFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function MaterialForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: MaterialFormProps) {
  const { data: techData } = useQuery({
    queryKey: ['technologies'],
    queryFn: () => technologiesApi.getAll(),
  });

  const technologies = techData?.data ?? [];

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      type:                   defaultValues?.type ?? '',
      color:                  defaultValues?.color ?? '',
      finish:                 defaultValues?.finish ?? undefined,
      grade:                  defaultValues?.grade ?? undefined,
      description:            defaultValues?.description ?? '',
      brand:                  defaultValues?.brand ?? '',
      pricePerGram:           defaultValues?.pricePerGram ?? 0.15,
      stockGrams:             defaultValues?.stockGrams ?? 0,
      lowStockThresholdGrams: defaultValues?.lowStockThresholdGrams ?? undefined,
      notes:                  defaultValues?.notes ?? '',
      printSettings:          defaultValues?.printSettings ?? '',
      printingTechnologyId:   defaultValues?.printingTechnologyId ?? undefined,
      isActive:               defaultValues?.isActive ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Type + Color */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATERIAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Galaxy Black" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Finish + Grade */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="finish"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Finish <span className="text-muted-foreground">(optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select finish..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATERIAL_FINISHES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade <span className="text-muted-foreground">(optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATERIAL_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description (customer-facing) */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description <span className="text-muted-foreground">(optional, customer-facing)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the material's properties and best use cases..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Brand + Technology */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand <span className="text-muted-foreground">(internal only)</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Polymaker" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="printingTechnologyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Technology <span className="text-muted-foreground">(optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technology..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {technologies.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price + Stock */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pricePerGram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per gram ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
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
            name="stockGrams"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock (grams)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
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
        </div>

        {/* Low Stock Threshold */}
        <FormField
          control={form.control}
          name="lowStockThresholdGrams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Low stock threshold (grams) <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  min={0}
                  placeholder="e.g. 500"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(
                    e.target.value === '' ? undefined : isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes (internal) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground">(internal only)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Internal notes, reorder reminders, supplier info..."
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Print Settings (JSON) */}
        <FormField
          control={form.control}
          name="printSettings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Print Settings <span className="text-muted-foreground">(optional, JSON)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"bedTemp":60,"hotendTemp":210,"printSpeed":60}'
                  rows={3}
                  className="font-mono text-xs"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active toggle */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Active (visible to customers)</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>

      </form>
    </Form>
  );
}