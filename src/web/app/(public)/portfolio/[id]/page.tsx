'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { publicApiClient } from '@/lib/api-client';
import { filesApi } from '@/lib/api/files';
import { useAuthStore } from '@/lib/stores/auth-store';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import { ArrowLeft, ShoppingCart, FileText, Layers, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { toProxiedUrl } from '@/lib/utils';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortfolioMaterial {
  id:           string;
  type:         string;
  color:        string;
  finish:       string | null;
  pricePerGram: number;
}

interface PortfolioItem {
  id:                  string;
  title:               string;
  description:         string;
  detailedDescription: string | null;
  imageUrl:            string | null;
  additionalImages:    { url: string; caption?: string; altText?: string; order: number }[] | null;
  tags:                string[] | null;
  isFeatured:          boolean;
  category:            string;
  modelFileUrl:        string | null;
  timelapseVideoUrl:   string | null;
  projectDetails:      string | null;
  material:            PortfolioMaterial | null;
}

// ─── Hook — image error fallback ──────────────────────────────────────────────
function useImageWithFallback(src: string | null) {
  const [errored, setErrored]   = useState(false);
  const [lastSrc, setLastSrc]   = useState(src);
  if (src !== lastSrc) { setLastSrc(src); setErrored(false); }
  return { show: !!src && !errored, onError: () => setErrored(true) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }              = use(params);
  const router              = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showViewer,    setShowViewer]    = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-item', id],
    queryFn:  () => publicApiClient.get<PortfolioItem>(`/Content/portfolio/${id}`),
  });

  const cloneMutation = useMutation({
    mutationFn: (destination: 'order' | 'quote') =>
      filesApi.clonePortfolioFile(id).then(res => ({ file: res.data, destination })),
    onSuccess: ({ file, destination }) => {
      router.push(destination === 'order'
        ? `/orders/new?fileId=${file.id}`
        : `/quotes/new?fileId=${file.id}`);
    },
    onError: () => toast.error('Failed to load model file. Please try again.'),
  });

  const handleCTA = (destination: 'order' | 'quote') => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/portfolio/${id}`);
      return;
    }
    cloneMutation.mutate(destination);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="pt-16 bg-[#0d0a06] min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-20 animate-pulse space-y-8">
          <div className="h-4 bg-white/[0.04] w-24" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-white/[0.04]" />
            <div className="space-y-4 pt-4">
              <div className="h-3 bg-white/[0.04] w-20" />
              <div className="h-12 bg-white/[0.04] w-3/4" />
              <div className="h-3 bg-white/[0.04] w-full mt-6" />
              <div className="h-3 bg-white/[0.04] w-5/6" />
              <div className="h-3 bg-white/[0.04] w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────────
  if (isError || !data?.data) {
    return (
      <div className="pt-16 bg-[#0d0a06] min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <p className={`${mono.className} text-[9px] uppercase tracking-[0.3em] text-white/22 mb-4`}>
            Not found
          </p>
          <p className="text-white/40 text-sm mb-8">
            This portfolio item couldn&apos;t be found.
          </p>
          <Link
            href="/portfolio"
            className={`${mono.className} inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/50 border border-white/12 px-6 h-10 hover:text-white hover:border-white/30 transition-colors`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const item = data.data;
  const allImages = [
    item.imageUrl,
    ...(item.additionalImages?.sort((a, b) => a.order - b.order).map(i => i.url) ?? []),
  ].filter((url): url is string => !!url);
  const activeImage = selectedImage ?? allImages[0] ?? null;

  return (
    <div className="pt-16 bg-[#0d0a06]">

      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <Link
          href="/portfolio"
          className={`${mono.className} inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors`}
        >
          <ArrowLeft className="h-3 w-3" /> Portfolio
        </Link>
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <section className="py-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

          {/* Left — media */}
          <div className="space-y-3">
            <MainMedia
              item={item}
              activeImage={activeImage}
              showViewer={showViewer}
              showTimelapse={showTimelapse}
              setShowViewer={setShowViewer}
              setShowTimelapse={setShowTimelapse}
            />

            {/* Thumbnail strip */}
            {allImages.length > 1 && !showViewer && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, i) => (
                  <ThumbnailButton
                    key={i}
                    url={url}
                    index={i}
                    active={activeImage === url}
                    onClick={() => setSelectedImage(url)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right — details */}
          <div className="space-y-8 lg:pt-2">

            {/* Category + featured */}
            <div className="flex flex-wrap items-center gap-2">
              {item.category && (
                <span className={`${mono.className} text-[9px] uppercase tracking-[0.25em] border border-amber-400/25 text-amber-400/60 px-3 py-1`}>
                  {item.category}
                </span>
              )}
              {item.isFeatured && (
                <span className={`${mono.className} text-[9px] uppercase tracking-[0.25em] bg-amber-400 text-black px-3 py-1 font-semibold`}>
                  Featured
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1
                className={`${display.className} text-white leading-[0.9] mb-5`}
                style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
              >
                {item.title.toUpperCase()}
              </h1>
              <p className="text-white/60 leading-relaxed">{item.description}</p>
            </div>

            {/* Detailed description */}
            {item.detailedDescription && (
              <p className="text-white/45 text-sm leading-relaxed border-t border-white/8 pt-6">
                {item.detailedDescription}
              </p>
            )}

            {/* Material */}
            {item.material && (
              <div className="border border-white/8 px-5 py-4 flex items-center gap-4">
                <Layers className="h-4 w-4 text-amber-400/60 shrink-0" />
                <div className="flex-1">
                  <p className={`${mono.className} text-[8.5px] uppercase tracking-[0.25em] text-white/25 mb-1`}>
                    Material
                  </p>
                  <p className="font-semibold text-sm" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {item.material.type}
                    <span className="text-white/40 font-normal"> · {item.material.color}</span>
                    {item.material.finish && (
                      <span className="text-white/30 font-normal"> · {item.material.finish}</span>
                    )}
                  </p>
                </div>
                {item.material.pricePerGram > 0 && (
                  <div className="text-right shrink-0">
                    <p className={`${mono.className} text-[8.5px] uppercase tracking-[0.2em] text-white/22 mb-0.5`}>
                      From
                    </p>
                    <p className={`${display.className} text-amber-400 text-2xl`}>
                      ${item.material.pricePerGram.toFixed(3)}
                      <span className={`${mono.className} text-[9px] text-white/25 ml-0.5`}>/g</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Project details */}
            {item.projectDetails && (
              <div className="border border-white/8 px-5 py-4 bg-white/[0.015]">
                <p className={`${mono.className} text-[8.5px] uppercase tracking-[0.25em] text-white/25 mb-3`}>
                  Project Details
                </p>
                <p className="text-white/55 text-sm leading-relaxed">{item.projectDetails}</p>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className={`${mono.className} text-[8px] uppercase tracking-[0.15em] border border-white/8 px-2.5 py-1 text-white/28`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="border-t border-white/8 pt-8 space-y-4">
              {item.modelFileUrl ? (
                <>
                  <p className="text-white/38 text-sm leading-relaxed">
                    Want something like this? Use this exact model to start your order.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleCTA('order')}
                      disabled={cloneMutation.isPending}
                      className={`${mono.className} flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold bg-amber-400 text-black h-12 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {cloneMutation.isPending ? 'Loading…' : 'Order This'}
                    </button>
                    <button
                      onClick={() => handleCTA('quote')}
                      disabled={cloneMutation.isPending}
                      className={`${mono.className} flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.15em] border border-white/15 text-white/60 h-12 hover:border-white/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Get a Quote
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/38 text-sm leading-relaxed">
                    Inspired by this project? Upload your own model to get started.
                  </p>
                  <Link
                    href={isAuthenticated ? '/upload' : '/register'}
                    className={`${mono.className} w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold bg-amber-400 text-black h-12 hover:bg-amber-300 transition-colors`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Start Your Own Project
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}


// ─── Main media area ──────────────────────────────────────────────────────────
function MainMedia({
  item,
  activeImage,
  showViewer,
  showTimelapse,
  setShowViewer,
  setShowTimelapse,
}: {
  item:             PortfolioItem;
  activeImage:      string | null;
  showViewer:       boolean;
  showTimelapse:    boolean;
  setShowViewer:    (v: boolean) => void;
  setShowTimelapse: (v: boolean) => void;
}) {
  const { show, onError } = useImageWithFallback(activeImage);

  return (
    <div className="aspect-square relative overflow-hidden bg-[#0b0907] border border-white/8">

      {/* Content layers */}
      {showViewer && item.modelFileUrl ? (
        <StlViewer url={toProxiedUrl(item.modelFileUrl)} className="w-full h-full" />
      ) : showTimelapse && item.timelapseVideoUrl ? (
        <video
          src={toProxiedUrl(item.timelapseVideoUrl)}
          controls
          autoPlay
          loop
          className="w-full h-full object-contain bg-black"
        />
      ) : show ? (
        <img
          src={activeImage!}
          alt={item.title}
          onError={onError}
          className="w-full h-full object-cover"
        />
      ) : (
        <ImagePlaceholder title={item.title} />
      )}

      {/* Toggle pills */}
      {(item.timelapseVideoUrl || item.modelFileUrl) && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {item.timelapseVideoUrl && (
            <TogglePill
              active={showTimelapse}
              label="Timelapse"
              onClick={() => { setShowViewer(false); setShowTimelapse(!showTimelapse); }}
            />
          )}
          {item.modelFileUrl && (
            <TogglePill
              active={showViewer}
              label={showViewer ? 'Photos' : '3D View'}
              onClick={() => { setShowTimelapse(false); setShowViewer(!showViewer); }}
            />
          )}
        </div>
      )}
    </div>
  );
}


// ─── Toggle pill ──────────────────────────────────────────────────────────────
function TogglePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${mono.className} text-[9px] uppercase tracking-[0.18em] px-3 h-7 border transition-colors ${
        active
          ? 'bg-amber-400 border-amber-400 text-black font-semibold'
          : 'bg-black/60 border-white/15 text-white/60 hover:text-white hover:border-white/30'
      }`}
    >
      {label}
    </button>
  );
}


// ─── Thumbnail button ─────────────────────────────────────────────────────────
function ThumbnailButton({
  url,
  index,
  active,
  onClick,
}: {
  url:     string;
  index:   number;
  active:  boolean;
  onClick: () => void;
}) {
  const { show, onError } = useImageWithFallback(url);
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-colors ${
        active ? 'border-amber-400' : 'border-white/10 hover:border-white/28'
      }`}
    >
      {show
        ? <img src={url} alt={`View ${index + 1}`} onError={onError} className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-white/[0.04]" />
      }
    </button>
  );
}


// ─── Image placeholder ────────────────────────────────────────────────────────
function ImagePlaceholder({ title }: { title: string }) {
  const hue = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: `hsl(${hue}, 12%, 9%)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="w-12 h-12 border opacity-15 mb-4" style={{ borderColor: `hsl(${hue}, 55%, 50%)` }} />
      <p className={`${mono.className} text-[8px] uppercase tracking-[0.3em] text-white/15`}>
        NoCo Mkae Lab. <br />3D Print
      </p>
    </div>
  );
}