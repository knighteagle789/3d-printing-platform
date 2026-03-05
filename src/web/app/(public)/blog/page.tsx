'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { contentApi } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, User } from 'lucide-react';

interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  authorName: string;
  publishedAt: string;
  tags: string[];
}

interface PagedBlogResponse {
  items: BlogPostSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function BlogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['blog', page],
    queryFn: () => contentApi.getBlogPosts(page, 9),
  });

  const response = data?.data as PagedBlogResponse | undefined;
  const posts = response?.items ?? [];
  const totalPages = response?.totalPages ?? 1;

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">
            Insights & Updates
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">Blog</h1>
          <p className="text-white/50 text-lg mt-4 max-w-xl">
            Tips on 3D printing, material guides, project spotlights, 
            and updates from the shop.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse border border-white/10 rounded-xl p-6 h-64" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <p className="text-lg">No posts yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <article className="border border-white/10 rounded-xl p-6 h-full hover:border-amber-400/30 transition-all duration-300 group flex flex-col">
                    {/* Tags */}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag}
                            className="text-xs border border-amber-400/30 text-amber-400/70 rounded-full px-2.5 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="font-black text-xl leading-tight mb-3 group-hover:text-amber-400 transition-colors flex-1">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="text-white/50 text-sm leading-relaxed mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                      <div className="flex items-center gap-3 text-white/30 text-xs">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {post.authorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-12">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 bg-transparent"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-white/40 text-sm px-4">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 bg-transparent"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}