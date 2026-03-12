'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { contentApi, UpdatePortfolioItemRequest } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MediaUploadField } from '@/components/admin/MediaUploadField';
import {
  ProjectDetailsEditor,
  ProjectDetailPair,
  parseProjectDetails,
  serialiseProjectDetails,
} from '@/components/admin/ProjectDetailsEditor';

const PORTFOLIO_CATEGORIES = [
  'Prototyping', 'Automotive', 'Aerospace', 'Medical', 'Architecture',
  'Art', 'Fashion', 'Jewelry', 'Industrial', 'Consumer', 'Educational', 'Other',
];

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  detailedDescription: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().url('Must be a valid URL'),
  tags: z.string().optional(),
  projectDetails: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  modelFileUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  timelapseVideoUrl: z.string().optional(),
  displayOrder: z.number().int().min(0),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// Shape of the item as it comes back from the API — projectDetails is a raw
// JSON string (or null), not the parsed pair array the form uses internally.
interface RawItem {
  title:               string;
  description:         string;
  detailedDescription: string | null;
  category:            string;
  imageUrl:            string;
  modelFileUrl:        string | null;
  timelapseVideoUrl:   string | null;
  tags:                string[] | null;
  projectDetails:      string | null;
  displayOrder:        number;
  isFeatured:          boolean;
  isPublished:         boolean;
}

export default function EditPortfolioItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-item', id],
    queryFn: () => contentApi.getPortfolioItem(id),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayOrder: 0, isFeatured: false, isPublished: false },
  });

  useEffect(() => {
    if (data?.data) {
      const item = data.data as RawItem;
      reset({
        title: item.title,
        description: item.description,
        detailedDescription: item.detailedDescription ?? '',
        category: item.category,
        imageUrl: item.imageUrl,
        modelFileUrl: item.modelFileUrl ?? '',
        timelapseVideoUrl: item.timelapseVideoUrl ?? '',
        tags: item.tags?.join(', ') ?? '',
        projectDetails: parseProjectDetails(item.projectDetails),
        displayOrder: item.displayOrder,
        isFeatured: item.isFeatured,
        isPublished: item.isPublished,
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (payload: UpdatePortfolioItemRequest) =>
      contentApi.updatePortfolioItem(id, payload),
    onSuccess: () => {
      toast.success('Portfolio item updated');
      router.push('/admin/content');
    },
    onError: () => toast.error('Failed to update portfolio item'),
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      title: data.title,
      description: data.description,
      detailedDescription: data.detailedDescription || undefined,
      category: data.category,
      imageUrl: data.imageUrl,
      modelFileUrl: data.modelFileUrl || undefined,
      timelapseVideoUrl: data.timelapseVideoUrl || undefined,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      projectDetails: serialiseProjectDetails(data.projectDetails ?? []),
      displayOrder: data.displayOrder,
      isFeatured: data.isFeatured,
      isPublished: data.isPublished,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Content
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Portfolio Item</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register('title')} />
          {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            key={watch('category')} // Reset select when category changes
            value={watch('category')} 
            onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PORTFOLIO_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-destructive text-sm">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <MediaUploadField
            label="Main Image"
            value={watch('imageUrl') ?? ''}
            onChange={(url) => setValue('imageUrl', url)}
            mode="image"
            error={errors.imageUrl?.message}
          />
          {errors.imageUrl && <p className="text-destructive text-sm">{errors.imageUrl.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelFileUrl">
            Model File URL <span className="text-muted-foreground">(optional — STL/OBJ for 3D viewer)</span>
          </Label>
          <MediaUploadField
            label="Model File"
            value={watch('modelFileUrl') ?? ''}
            onChange={(url) => setValue('modelFileUrl', url)}
            mode="model"
            error={errors.modelFileUrl?.message}
          />
          {errors.modelFileUrl && <p className="text-destructive text-sm">{errors.modelFileUrl.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="timelapseVideoUrl">
            Timelapse Video URL <span className="text-muted-foreground">(optional — MP4 for video preview)</span>
          </Label>
          <MediaUploadField
            label="Timelapse Video"
            value={watch('timelapseVideoUrl') ?? ''}
            onChange={(url) => setValue('timelapseVideoUrl', url)}
            mode="video"
            error={errors.timelapseVideoUrl?.message}
          />
          {errors.timelapseVideoUrl && <p className="text-destructive text-sm">{errors.timelapseVideoUrl.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Short Description</Label>
          <Textarea id="description" {...register('description')} rows={3} />
          {errors.description && <p className="text-destructive text-sm">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="detailedDescription">Detailed Description <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea id="detailedDescription" {...register('detailedDescription')} rows={5} />
        </div>

        <div className="space-y-2">
          <Label>Project Details <span className="text-muted-foreground">(optional)</span></Label>
          <p className="text-muted-foreground text-xs">
            Add key / value pairs like Print Time, Layer Height, Infill, etc.
          </p>
          <ProjectDetailsEditor
            pairs={watch('projectDetails') ?? []}
            onChange={(pairs: ProjectDetailPair[]) => setValue('projectDetails', pairs)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
          <Input id="tags" {...register('tags')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input id="displayOrder" type="number" {...register('displayOrder')} />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-4">
          <div>
            <p className="font-medium text-sm">Featured</p>
            <p className="text-muted-foreground text-xs">Show on homepage featured section</p>
          </div>
          <Switch
            checked={watch('isFeatured')}
            onCheckedChange={(v) => setValue('isFeatured', v)}
          />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-4">
          <div>
            <p className="font-medium text-sm">Published</p>
            <p className="text-muted-foreground text-xs">Visible on the public portfolio page</p>
          </div>
          <Switch
            checked={watch('isPublished')}
            onCheckedChange={(v) => setValue('isPublished', v)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/content')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}