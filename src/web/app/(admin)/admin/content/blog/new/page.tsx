'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { contentApi, CreateBlogPostRequest } from '@/lib/api/content';
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

const BLOG_CATEGORIES = [
  'News', 'Tutorial', 'CaseStudy', 'Technology',
  'Materials', 'Industry', 'Tips', 'Announcement',
];

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().min(1, 'Summary is required'),
  content: z.string().min(1, 'Content is required'),
  featuredImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  tags: z.string().optional(),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function NewBlogPostPage() {
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPublished: false },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateBlogPostRequest) => contentApi.createBlogPost(data),
    onSuccess: () => {
      toast.success('Blog post created');
      router.push('/admin/content');
    },
    onError: () => toast.error('Failed to create blog post'),
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      title: data.title,
      summary: data.summary,
      content: data.content,
      featuredImageUrl: data.featuredImageUrl || undefined,
      category: data.category,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Content
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register('title')} placeholder="e.g. How We Printed a Prosthetic Hand" />
          {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {BLOG_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-destructive text-sm">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary / Excerpt</Label>
          <Textarea id="summary" {...register('summary')} rows={3}
            placeholder="Brief summary shown in blog listings" />
          {errors.summary && <p className="text-destructive text-sm">{errors.summary.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">
            Content{' '}
            <span className="text-muted-foreground font-normal">(Markdown supported)</span>
          </Label>
          <Textarea id="content" {...register('content')} rows={20}
            className="font-mono text-sm"
            placeholder="Write your post in Markdown...&#10;&#10;## Heading&#10;&#10;Paragraph text here." />
          {errors.content && <p className="text-destructive text-sm">{errors.content.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="featuredImageUrl">
            Featured Image URL{' '}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="featuredImageUrl" {...register('featuredImageUrl')}
            placeholder="https://..." />
          {errors.featuredImageUrl && (
            <p className="text-destructive text-sm">{errors.featuredImageUrl.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
          <Input id="tags" {...register('tags')} placeholder="e.g. tutorial, PLA, beginner" />
        </div>

        <div className="flex items-center justify-between border rounded-lg p-4">
          <div>
            <p className="font-medium text-sm">Publish immediately</p>
            <p className="text-muted-foreground text-xs">
              If off, the post is saved as a draft
            </p>
          </div>
          <Switch
            checked={watch('isPublished')}
            onCheckedChange={(v) => setValue('isPublished', v)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Post'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/content')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}