'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '@/lib/api/materials';
import { MaterialForm, MaterialFormValues } from '../_components/material-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'material', id],
    queryFn: () => materialsApi.getById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (values: MaterialFormValues) =>
      materialsApi.update(id, {
        name:            values.name,
        brand:           values.brand || undefined,
        description:     values.description,
        type:            values.type,
        pricePerGram:    values.pricePerGram,
        availableColors: values.availableColors.map((c) => c.value).filter(Boolean),
        properties:      values.properties.length > 0
            ? JSON.stringify(
                Object.fromEntries(values.properties.map((p) => [p.key, p.value]))
            )
            : undefined,
        isActive:        values.isActive,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'material', id] });
      toast.success(`${res.data.name} updated successfully.`);
    },
    onError: () => toast.error('Failed to update material.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      toast.success('Material deleted.');
      router.push('/admin/materials');
    },
    onError: () => toast.error('Failed to delete material.'),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const material = data?.data;
  if (!material) return null;

  return (
    <div className="p-6 max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6"
        onClick={() => router.push('/admin/materials')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Materials
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{material.name}</h1>
          {material.brand && (
            <p className="text-muted-foreground text-sm mt-1">{material.brand}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={material.isActive ? 'default' : 'destructive'}>
            {material.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button
            variant="destructive"
            size="sm"
            disabled={!material.isActive || deleteMutation.isPending}
            onClick={() => {
              if (confirm(`Deactivate ${material.name}?`)) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material Details</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialForm
            defaultValues={{
              name:            material.name,
              brand:           material.brand ?? '',
              description:     material.description,
              type:            material.type,
              pricePerGram:    material.pricePerGram,
              availableColors: material.availableColors?.map((c) => ({ value: c })) ?? [],
              properties: material.properties
                ? Object.entries(JSON.parse(material.properties)).map(([key, value]) => ({
                    key,
                    value: String(value),
                }))
                : [],
              isActive:        material.isActive,
            }}
            onSubmit={(values) => updateMutation.mutate(values)}
            isSubmitting={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}