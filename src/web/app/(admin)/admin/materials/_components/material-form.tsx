'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Material, MATERIAL_TYPES } from '@/lib/api/materials';
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
import { X, Plus } from 'lucide-react';

const materialSchema = z.object({
  name:           z.string().min(1, 'Name is required'),
  brand:          z.string().optional(),
  description:    z.string().min(1, 'Description is required'),
  type:           z.string().min(1, 'Type is required'),
  properties:      z.array(z.object({
    key: z.string().min(1),
    value: z.string().min(1),
  })),
  pricePerGram:   z.number().min(0.0001, 'Price must be greater than 0'),
  availableColors: z.array(z.object({ value: z.string().min(1) })),
  isActive:       z.boolean(),
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
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name:            defaultValues?.name ?? '',
      brand:           defaultValues?.brand ?? '',
      description:     defaultValues?.description ?? '',
      type:            defaultValues?.type ?? '',
      properties:      defaultValues?.properties ?? [],
      pricePerGram:    defaultValues?.pricePerGram ?? 0.15,
      availableColors: defaultValues?.availableColors ?? [],
      isActive:        defaultValues?.isActive ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'availableColors',
  });

  const { fields: propFields, append: appendProp, remove: removeProp } = useFieldArray({
    control: form.control,
    name: 'properties',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Name + Brand */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="PLA (Standard)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand <span className="text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Polymaker" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the material properties and best use cases..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type + Price */}
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
        </div>

        {/* Colors */}
        <div>
          <FormLabel>Available Colors</FormLabel>
          <div className="mt-2 space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`availableColors.${index}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="e.g. Red, White, Natural..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ value: '' })}
              className="gap-1"
            >
              <Plus className="h-3 w-3" /> Add Color
            </Button>
          </div>
        </div>

        {/* Properties */}
        <div>
        <FormLabel>Properties</FormLabel>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Technical specs shown to customers (e.g. strength, maxTemp, flexibility)
        </p>
        <div className="space-y-2">
            {propFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
                <FormField
                control={form.control}
                name={`properties.${index}.key`}
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormControl>
                        <Input placeholder="e.g. strength" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name={`properties.${index}.value`}
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormControl>
                        <Input placeholder="e.g. High" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeProp(index)}
                >
                <X className="h-4 w-4" />
                </Button>
            </div>
            ))}
            <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendProp({ key: '', value: '' })}
            className="gap-1"
            >
            <Plus className="h-3 w-3" /> Add Property
            </Button>
        </div>
        </div>

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