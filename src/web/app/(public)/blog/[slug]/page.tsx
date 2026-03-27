import type { Metadata } from 'next';
import BlogPostContent from './_components/BlogPostContent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5267/api/v1';

interface BlogPost {
  title:            string;
  slug:             string;
  excerpt:          string | null;
  authorName:       string;
  publishedAt:      string;
  tags:             string[];
  featuredImageUrl: string | null;
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/Content/blog/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) {
    return { title: 'Post Not Found — NoCo Make Lab' };
  }

  const description = post.excerpt ??
    `${post.title} — a post from the NoCo Make Lab blog.`;

  return {
    title:       `${post.title} — NoCo Make Lab`,
    description,
    openGraph: {
      type:          'article',
      title:         post.title,
      description,
      url:           `https://noco3dworks.com/blog/${slug}`,
      siteName:      'NoCo Make Lab',
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors:       [post.authorName],
      tags:          post.tags,
      ...(post.featuredImageUrl && {
        images: [{ url: post.featuredImageUrl, alt: post.title }],
      }),
    },
    twitter: {
      card:        post.featuredImageUrl ? 'summary_large_image' : 'summary',
      title:       post.title,
      description,
      ...(post.featuredImageUrl && { images: [post.featuredImageUrl] }),
    },
    alternates: {
      canonical: `https://noco3dworks.com/blog/${slug}`,
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <BlogPostContent params={params} />;
}