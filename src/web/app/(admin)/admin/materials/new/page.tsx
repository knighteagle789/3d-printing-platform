'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi, type MaterialFinish, type MaterialGrade } from '@/lib/api/materials';
import { MaterialForm, MaterialFormValues } from '../_components/material-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewMaterialPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: MaterialFormValues) =>
      materialsApi.create({
        type:                   values.type,
        color:                  values.color,
        finish:                 values.finish as MaterialFinish | undefined || undefined,
        grade:                  values.grade as MaterialGrade | undefined || undefined,
        description:            values.description || undefined,
        brand:                  values.brand || undefined,
        pricePerGram:           values.pricePerGram,
        stockGrams:             values.stockGrams,
        lowStockThresholdGrams: values.lowStockThresholdGrams,
        notes:                  values.notes || undefined,
        printSettings:          values.printSettings || undefined,
        printingTechnologyId:   values.printingTechnologyId || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      toast.success(`${res.data.type} - ${res.data.color} created successfully.`);
      router.push('/admin/materials');
    },
    onError: () => toast.error('Failed to create material.'),
  });

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

      <h1 className="text-2xl font-bold mb-6">Add Material</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material Details</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialForm
            onSubmit={(values) => mutation.mutate(values)}
            isSubmitting={mutation.isPending}
            submitLabel="Create Material"
          />
        </CardContent>
      </Card>
    </div>
  );
}