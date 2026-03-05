'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  tags: string[];
  featured: boolean;
  emjoi?: string;
  material?: string;
}

export default function PortfolioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiClient.get<PortfolioItem[]>('/Content/portfolio'),
  });

  type PortfolioResponse = PortfolioItem[] | { items: PortfolioItem[] };

  const responseDatas = data?.data as PortfolioResponse;
  const items = Array.isArray(responseDatas) ? responseDatas : (responseDatas?.items ?? []);

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">Our Work</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">Portfolio</h1>
          <p className="text-white/50 text-lg mt-4 max-w-xl">
            A selection of projects we&apos;ve brought to life. From functional prototypes 
            to artistic pieces — precision in every layer.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/5 rounded-xl aspect-square mb-4" />
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <div className="group border border-white/10 rounded-xl overflow-hidden hover:border-amber-400/30 transition-all duration-300">
      <div className="aspect-square bg-white/[0.03] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-2">📦</div>
            <p className="text-white/20 text-xs uppercase tracking-widest">3D Print</p>
          </div>
        </div>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />
        {item.featured && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-amber-400 text-black text-xs font-bold">Featured</Badge>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-1">{item.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-3">{item.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag}
              className="text-xs border border-white/10 rounded-full px-2.5 py-0.5 text-white/40">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}