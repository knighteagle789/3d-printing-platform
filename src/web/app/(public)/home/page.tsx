import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers, Zap, Shield, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
        {/* Amber glow */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-amber-400/30 rounded-full px-4 py-1.5 text-amber-400 text-xs uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Professional 3D Printing Services
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-6">
              Precision<br />
              <span className="text-amber-400">in every</span><br />
              layer.
            </h1>

            <p className="text-xl text-white/60 leading-relaxed max-w-xl mb-10">
              From rapid prototypes to production runs — we bring your 3D models 
              to life with professional-grade materials and expert craftsmanship.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="bg-amber-400 text-black hover:bg-amber-300 font-bold px-8 h-12 text-base"
                asChild
              >
                <Link href="/register">
                  Get a Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 bg-transparent px-8 h-12 text-base"
                asChild
              >
                <Link href="/portfolio">View Our Work</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative stat strip */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '48hr', label: 'Typical turnaround' },
              { value: '10+', label: 'Materials available' },
              { value: '0.1mm', label: 'Minimum layer height' },
              { value: '100%', label: 'Quality checked' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-black text-amber-400">{stat.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">Why PrintHub</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Built for results.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Layers,
                title: 'Premium Materials',
                desc: 'PLA, PETG, ABS, TPU and more. Every material optimized for your application.'
              },
              {
                icon: Zap,
                title: 'Fast Turnaround',
                desc: 'Most orders completed within 48 hours. Rush options available for urgent needs.'
              },
              {
                icon: Shield,
                title: 'Quality Guaranteed',
                desc: 'Every print inspected before shipping. We stand behind our work, period.'
              },
              {
                icon: Clock,
                title: 'Real-time Updates',
                desc: 'Track your order from submission to delivery. No guessing, no waiting.'
              },
            ].map((feature) => (
              <div key={feature.title}
                className="border border-white/10 rounded-xl p-6 hover:border-amber-400/30 transition-colors group">
                <feature.icon className="h-6 w-6 text-amber-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Simple process.<br />Exceptional results.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Upload Your Model', desc: 'Upload your STL file directly through our platform. We support all major 3D file formats.' },
              { step: '02', title: 'Get a Quote', desc: 'Receive an instant estimate or request a detailed quote from our team for complex projects.' },
              { step: '03', title: 'We Print', desc: 'Our machines get to work. You can track progress in real time through your dashboard.' },
              { step: '04', title: 'Delivered to You', desc: 'Quality checked and carefully packaged. Delivered to your door.' },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-[60%] right-0 h-px bg-white/10" />
                )}
                <div className="text-5xl font-black text-white/10 mb-4">{item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="border border-amber-400/20 rounded-2xl p-12 md:p-16 bg-amber-400/5 text-center">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Ready to start printing?
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Create a free account and upload your first model in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-amber-400 text-black hover:bg-amber-300 font-bold px-10 h-12 text-base"
                asChild
              >
                <Link href="/register">Create Free Account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 bg-transparent px-10 h-12 text-base"
                asChild
              >
                <Link href="/contact">Talk to Us First</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}