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
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Brand</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Price/g</th>
                  <th className="text-left px-4 py-3 font-medium">Colors</th>
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
                    <td className="px-4 py-3 font-medium">{material.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {material.brand ?? '—'}
                    </td>
                    <td className="px-4 py-3">{material.type}</td>
                    <td className="px-4 py-3">{usd.format(material.pricePerGram)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {material.availableColors?.slice(0, 4).map((c) => (
                          <span
                            key={c}
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          >
                            {c}
                          </span>
                        ))}
                        {(material.availableColors?.length ?? 0) > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{material.availableColors!.length - 4} more
                          </span>
                        )}
                      </div>
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