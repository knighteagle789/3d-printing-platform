'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { contentApi } from '@/lib/api/content';
import { ArrowLeft, ArrowRight, Calendar, User } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogPost {
  id:               string;
  title:            string;
  slug:             string;
  content:          string;
  excerpt:          string | null;
  authorName:       string;
  publishedAt:      string;
  tags:             string[];
  featuredImageUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router   = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn:  () => contentApi.getBlogPostBySlug(slug),
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="pt-16 bg-[#0d0a06] min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-24 space-y-6 animate-pulse">
          <div className="h-3 bg-white/5 w-24" />
          <div className="h-20 bg-white/5 w-3/4 mt-10" />
          <div className="h-3 bg-white/5 w-40" />
          <div className="space-y-3 mt-16">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`h-3 bg-white/5 ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError || !data) {
    return (
      <div className="pt-16 bg-[#0d0a06] min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.25em] text-white/25 mb-8`}>
            Post not found
          </p>
          <button
            onClick={() => router.push('/blog')}
            className={`${mono.className} inline-flex items-center gap-2 border border-white/12 text-white/45 text-[10px] uppercase tracking-[0.2em] px-6 h-9 hover:text-white hover:border-white/25 transition-colors`}
          >
            <ArrowLeft className="h-3 w-3" /> Back to Blog
          </button>
        </div>
      </div>
    );
  }

  const post = data.data as BlogPost;

  return (
    <div className="pt-16 bg-[#0d0a06]">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative border-b border-white/10 overflow-hidden">

        {/* Featured image — full bleed behind a gradient if present */}
        {post.featuredImageUrl && (
          <div className="absolute inset-0">
            <img
              src={post.featuredImageUrl}
              alt=""
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a06]/60 via-[#0d0a06]/80 to-[#0d0a06]" />
          </div>
        )}

        {/* Grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 py-20">
          {/* Back link */}
          <Link
            href="/blog"
            className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/30 hover:text-amber-400 transition-colors mb-12`}
          >
            <ArrowLeft className="h-3 w-3" /> All Posts
          </Link>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-7">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className={`${mono.className} text-[8px] uppercase tracking-[0.18em] border border-amber-400/25 text-amber-400/60 px-2 py-0.5`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1
            className="font-black tracking-tight leading-[1.08] mb-8 text-white"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
          >
            {post.title}
          </h1>

          {/* Meta */}
          <div className={`${mono.className} flex items-center gap-5 text-[9px] uppercase tracking-[0.2em] text-white/30`}>
            <span className="flex items-center gap-1.5">
              <User className="h-2.5 w-2.5" /> {post.authorName}
            </span>
            <span className="w-px h-3 bg-white/15" />
            <span className="flex items-center gap-1.5">
              <Calendar className="h-2.5 w-2.5" /> {formatDate(post.publishedAt)}
            </span>
          </div>
        </div>
      </section>


      {/* ════════════════════════════ CONTENT ════════════════════════════ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">

          {/* Excerpt / lede */}
          {post.excerpt && (
            <p
              className="text-xl text-white/55 leading-relaxed mb-12 pb-12 border-b border-white/8"
              style={{ fontFamily: 'var(--font-epilogue)' }}
            >
              {post.excerpt}
            </p>
          )}

          {/* Markdown body */}
          <div className="prose-blog">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="font-black text-white mt-12 mb-4 tracking-tight leading-[1.1]"
                    style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-black text-white mt-10 mb-4 tracking-tight leading-[1.15]"
                    style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.4rem, 2.8vw, 2rem)' }}>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-bold text-white mt-8 mb-3 text-xl tracking-tight"
                    style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/62 leading-[1.8] mb-5 text-[15px]">{children}</p>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-amber-400 no-underline hover:underline underline-offset-2">
                    {children}
                  </a>
                ),
                strong: ({ children }) => (
                  <strong className="text-white font-semibold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-white/70 italic">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-2 mb-5 pl-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="space-y-2 mb-5 pl-0 list-none counter-reset-item">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="flex gap-3 items-start text-white/62 text-[15px] leading-[1.8]">
                    <span className="mt-[0.6em] w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    <span>{children}</span>
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-amber-400 pl-6 my-6 text-white/45 italic text-base leading-relaxed">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <code className={`${mono.className} block bg-white/[0.04] border border-white/8 px-5 py-4 text-[13px] text-amber-400/80 overflow-x-auto my-6 leading-relaxed`}>
                      {children}
                    </code>
                  ) : (
                    <code className={`${mono.className} text-amber-400 bg-white/[0.06] px-1.5 py-0.5 text-[12px]`}>
                      {children}
                    </code>
                  );
                },
                hr: () => <hr className="border-white/8 my-10" />,
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt}
                    className="w-full my-8 border border-white/8"
                  />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* ── Footer ── */}
          <div className="mt-20 pt-8 border-t border-white/8 flex items-center justify-between">
            <Link
              href="/blog"
              className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/30 hover:text-white transition-colors`}
            >
              <ArrowLeft className="h-3 w-3" /> All Posts
            </Link>
            <div className="flex gap-3">
              {post.tags?.slice(0, 2).map(tag => (
                <Link
                  key={tag}
                  href="/blog"
                  className={`${mono.className} text-[8px] uppercase tracking-[0.18em] border border-white/10 text-white/28 px-3 h-7 flex items-center hover:border-amber-400/30 hover:text-amber-400/60 transition-colors`}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════ CTA ════════════════════════════ */}
      <section className="relative overflow-hidden bg-amber-400">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-28 flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
          <div>
            <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-black/32 mb-5`}>
              Ready to print?
            </p>
            <h2
              className={`${display.className} text-black leading-[0.88]`}
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}
            >
              START YOUR<br />PROJECT<br />TODAY<span className="text-black/35">.</span>
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="hidden md:block text-black/50 text-sm max-w-xs text-right leading-relaxed">
              Upload your model and get an instant quote — no account required to start.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={`${mono.className} inline-flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-zinc-900 transition-colors`}
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/portfolio"
                className={`${mono.className} inline-flex items-center border border-black/20 text-black text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-black/5 transition-colors`}
              >
                See Our Work
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}