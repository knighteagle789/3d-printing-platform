'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { contentApi } from '@/lib/api/content';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  authorName: string;
  publishedAt: string;
  tags: string[];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => contentApi.getBlogPostBySlug(slug),
  });

  if (isLoading) {
    return (
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-20 animate-pulse space-y-4">
          <div className="h-12 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="h-96 bg-white/5 rounded mt-8" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-white/50 mb-6">Post not found.</p>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 bg-transparent"
            onClick={() => router.push('/blog')}
          >
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  const post = data.data as BlogPost;

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-16 px-6 border-b border-white/10">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white mb-8 -ml-2"
            onClick={() => router.push('/blog')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Blog
          </Button>

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map((tag) => (
                <span key={tag}
                  className="text-xs border border-amber-400/30 text-amber-400/70 rounded-full px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-white/40 text-sm">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.authorName}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          {post.excerpt && (
            <p className="text-xl text-white/60 leading-relaxed mb-10 pb-10 border-b border-white/10 italic">
              {post.excerpt}
            </p>
          )}

        <div className="space-y-6 text-white/70 leading-relaxed">
        <ReactMarkdown
            components={{
            h1: ({children}) => <h1 className="text-3xl font-black text-white mt-8">{children}</h1>,
            h2: ({children}) => <h2 className="text-2xl font-black text-white mt-8">{children}</h2>,
            h3: ({children}) => <h3 className="text-xl font-bold text-white mt-6">{children}</h3>,
            p: ({children}) => <p className="leading-relaxed">{children}</p>,
            a: ({href, children}) => <a href={href} className="text-amber-400 no-underline hover:underline">{children}</a>,
            strong: ({children}) => <strong className="text-white font-bold">{children}</strong>,
            ul: ({children}) => <ul className="list-disc pl-6 space-y-2">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal pl-6 space-y-2">{children}</ol>,
            blockquote: ({children}) => <blockquote className="border-l-2 border-amber-400 pl-4 text-white/50 italic">{children}</blockquote>,
            code: ({children}) => <code className="text-amber-400 bg-white/5 rounded px-1 text-sm">{children}</code>,
            hr: () => <hr className="border-white/10" />,
            }}
        >
            {post.content}
        </ReactMarkdown>
        </div>

          {/* Footer nav */}
          <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 bg-transparent"
              asChild
            >
              <Link href="/blog">← All Posts</Link>
            </Button>
            <Button
              className="bg-amber-400 text-black hover:bg-amber-300 font-bold"
              asChild
            >
              <Link href="/register">Start a Project</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}