'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { contentApi } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  isPublished: boolean;
  publishedAt: string | null;
  viewCount: number;
  author: { firstName: string; lastName: string } | null;
}

interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
}

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'portfolio' | 'blog'; title: string } | null>(null);

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ['admin-portfolio'],
    queryFn: () => contentApi.getPortfolio(1, 50),
  });

  const { data: blogData, isLoading: blogLoading } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: () => contentApi.getAllBlogPosts(1, 50),
  });

  const portfolioItems: PortfolioItem[] = (portfolioData?.data as PagedResponse<PortfolioItem> | undefined)?.items ?? [];
  const blogPosts: BlogPost[] = (blogData?.data as PagedResponse<BlogPost> | undefined)?.items ?? [];

  const deletePortfolioMutation = useMutation({
    mutationFn: (id: string) => contentApi.deletePortfolioItem(id),
    onSuccess: () => {
      toast.success('Portfolio item deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (id: string) => contentApi.deleteBlogPost(id),
    onSuccess: () => {
      toast.success('Blog post deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'portfolio') {
      deletePortfolioMutation.mutate(deleteTarget.id);
    } else {
      deleteBlogMutation.mutate(deleteTarget.id);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage portfolio items and blog posts.
        </p>
      </div>

      <Tabs defaultValue="portfolio">
        <TabsList className="mb-6">
          <TabsTrigger value="portfolio">
            Portfolio ({portfolioItems.length})
          </TabsTrigger>
          <TabsTrigger value="blog">
            Blog ({blogPosts.length})
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/admin/content/portfolio/new">
                <Plus className="h-4 w-4 mr-2" />
                New Portfolio Item
              </Link>
            </Button>
          </div>

          {portfolioLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No portfolio items yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    portfolioItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>{item.displayOrder}</TableCell>
                        <TableCell>
                          {item.isFeatured ? (
                            <Badge className="bg-amber-100 text-amber-800">Featured</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isPublished ? (
                            <Badge variant="default" className="gap-1">
                              <Eye className="h-3 w-3" /> Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <EyeOff className="h-3 w-3" /> Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/content/portfolio/${item.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({
                                id: item.id, type: 'portfolio', title: item.title
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Blog Tab */}
        <TabsContent value="blog">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/admin/content/blog/new">
                <Plus className="h-4 w-4 mr-2" />
                New Blog Post
              </Link>
            </Button>
          </div>

          {blogLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No blog posts yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    blogPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {post.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{post.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {post.author
                            ? `${post.author.firstName} ${post.author.lastName}`
                            : '—'}
                        </TableCell>
                        <TableCell>{post.viewCount}</TableCell>
                        <TableCell>
                          {post.isPublished ? (
                            <Badge variant="default" className="gap-1">
                              <Eye className="h-3 w-3" /> Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <EyeOff className="h-3 w-3" /> Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/content/blog/${post.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({
                                id: post.id, type: 'blog', title: post.title
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'blog' ? 'Blog Post' : 'Portfolio Item'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}