'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { materialsApi } from '@/lib/api/materials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const grams = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toFixed(1)} kg`
    : `${value} g`;

export default function AdminMaterialsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'materials'],
    queryFn: () => materialsApi.getAllAdmin(),
  });

  const materials = data?.data ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Materials</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the materials catalog
          </p>
        </div>
        <Button onClick={() => router.push('/admin/materials/new')}>
          Add Material
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              No materials found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Color</th>
                  <th className="text-left px-4 py-3 font-medium">Finish</th>
                  <th className="text-left px-4 py-3 font-medium">Grade</th>
                  <th className="text-left px-4 py-3 font-medium">Price/g</th>
                  <th className="text-left px-4 py-3 font-medium">Stock</th>
                  <th className="text-left px-4 py-3 font-medium">Technology</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr
                    key={material.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/admin/materials/${material.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{material.type}</td>
                    <td className="px-4 py-3">{material.color}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {material.finish ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {material.grade ?? '—'}
                    </td>
                    <td className="px-4 py-3">{usd.format(material.pricePerGram)}</td>
                    <td className="px-4 py-3">
                      <span className={material.isLowStock ? 'text-destructive font-medium' : ''}>
                        {grams(material.stockGrams)}
                      </span>
                      {material.isLowStock && (
                        <span className="ml-1.5 text-xs text-destructive">Low</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {material.technology?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={material.isActive ? 'default' : 'destructive'}>
                        {material.isActive ? 'Active' : 'Inactive'}
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