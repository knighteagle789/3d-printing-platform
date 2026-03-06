'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { contentApi } from '@/lib/api/content';
import { filesApi } from '@/lib/api/files';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StlViewer } from '@/components/3d-viewer/StlViewer';
import { ArrowLeft, ShoppingCart, FileText, Box, Layers, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { toProxiedUrl } from '@/lib/utils';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  detailedDescription: string | null;
  imageUrl: string;
  additionalImages: { url: string; caption?: string; altText?: string; order: number }[] | null;
  tags: string[] | null;
  isFeatured: boolean;
  category: string;
  modelFileUrl: string | null;
  timelapseVideoUrl: string | null;
  projectDetails: string | null;
  material: { id: string; name: string; pricePerGram: number } | null;
}

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-item', id],
    queryFn: () => contentApi.getPortfolioItem(id),
  });

  const cloneMutation = useMutation({
    mutationFn: (destination: 'order' | 'quote') =>
      filesApi.clonePortfolioFile(id).then(res => ({ file: res.data, destination })),
    onSuccess: ({ file, destination }) => {
      if (destination === 'order') {
        router.push(`/orders/new?fileId=${file.id}`);
      } else {
        router.push(`/quotes/new?fileId=${file.id}`);
      }
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

  if (isLoading) {
    return (
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 animate-pulse space-y-8">
          <div className="h-8 bg-white/5 rounded w-1/4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-white/5 rounded-xl" />
            <div className="space-y-4">
              <div className="h-10 bg-white/5 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <p className="text-white/50 mb-6">Portfolio item not found.</p>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 bg-transparent" asChild>
            <Link href="/portfolio">← Back to Portfolio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const item = data.data as PortfolioItem;
  const allImages = [
    item.imageUrl,
    ...(item.additionalImages?.sort((a, b) => a.order - b.order).map(i => i.url) ?? []),
  ].filter(Boolean);
  const activeImage = selectedImage ?? allImages[0];

  return (
    <div className="pt-16">
      {/* Back nav */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <Button variant="ghost" size="sm" className="text-white/50 hover:text-white -ml-2" asChild>
          <Link href="/portfolio">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Portfolio
          </Link>
        </Button>
      </div>

      {/* Main content */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left — images + 3D viewer + video */}
          <div className="space-y-4">
            {/* Main image / viewer toggle */}
            <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 relative">
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
              ) : activeImage ? (
                <img src={activeImage} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white/20">
                    <Box className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">No image available</p>
                  </div>
                </div>
              )}

              {/* Viewer toggle buttons */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {item.timelapseVideoUrl && (
                  <button
                    onClick={() => { setShowViewer(false); setShowTimelapse(t => !t); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      showTimelapse
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                    }`}
                  >
                    🎬 Timelapse
                  </button>
                )}
                {item.modelFileUrl && (
                  <button
                    onClick={() => { setShowTimelapse(false); setShowViewer(v => !v); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      showViewer
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                    }`}
                  >
                    {showViewer ? '📷 Photos' : '🔄 3D View'}
                  </button>
                )}
              </div>

              {item.isFeatured && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-amber-400 text-black text-xs font-bold">Featured</Badge>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && !showViewer && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(url)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === url ? 'border-amber-400' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={url} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — details */}
          <div className="space-y-6">
            {/* Category + tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-amber-400/30 text-amber-400/70">
                {item.category}
              </Badge>
              {item.tags?.map(tag => (
                <span key={tag} className="text-xs border border-white/10 rounded-full px-2.5 py-0.5 text-white/40">
                  {tag}
                </span>
              ))}
            </div>

            {/* Title + description */}
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-4">{item.title}</h1>
              <p className="text-white/60 leading-relaxed">{item.description}</p>
            </div>

            {/* Detailed description */}
            {item.detailedDescription && (
              <p className="text-white/50 text-sm leading-relaxed border-t border-white/10 pt-6">
                {item.detailedDescription}
              </p>
            )}

            {/* Material */}
            {item.material && (
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3">
                <Layers className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest">Material</p>
                  <p className="font-medium">{item.material.name}</p>
                </div>
                {item.material.pricePerGram && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-white/40 uppercase tracking-widest">From</p>
                    <p className="font-medium text-amber-400">
                      ${item.material.pricePerGram.toFixed(2)}/g
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Project details */}
            {item.projectDetails && (
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-amber-400" />
                  <p className="text-xs text-white/40 uppercase tracking-widest">Project Details</p>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{item.projectDetails}</p>
              </div>
            )}

            {/* CTAs */}
            <div className="border-t border-white/10 pt-6 space-y-3">
              {item.modelFileUrl ? (
                <>
                  <p className="text-white/40 text-sm">
                    Want something like this? Use this exact model to start your order.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="bg-amber-400 text-black hover:bg-amber-300 font-bold h-12"
                      disabled={cloneMutation.isPending}
                      onClick={() => handleCTA('order')}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {cloneMutation.isPending ? 'Loading...' : 'Order This'}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/5 bg-transparent h-12"
                      disabled={cloneMutation.isPending}
                      onClick={() => handleCTA('quote')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Get a Quote
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/40 text-sm">
                    Inspired by this project? Upload your own model to get started.
                  </p>
                  <Button
                    className="w-full bg-amber-400 text-black hover:bg-amber-300 font-bold h-12"
                    asChild
                  >
                    <Link href={isAuthenticated ? '/upload' : '/register'}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Start Your Own Project
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}