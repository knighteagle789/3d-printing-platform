import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-20 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">Our Story</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6">
              We make ideas<br />
              <span className="text-amber-400">tangible.</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              NoCo Make Lab started as a passion for turning digital designs into physical 
              objects. What began as a single printer in a garage is now a dedicated
              one-person shop serving engineers, designers, hobbyists, and makers
              right here in Northern Colorado.
            </p>
          </div>
          {/* Decorative element */}
          <div className="relative h-64 md:h-80">
            <div className="absolute inset-0 border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🖨️</div>
                  <p className="text-white/20 text-sm uppercase tracking-widest">Est. 2024</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 w-24 h-24 border border-amber-400/30 rounded-xl" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">What Drives Us</p>
          <h2 className="text-4xl font-black mb-12">Our values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Precision over speed',
                desc: 'We could rush every job. We choose not to. Every print is checked before it leaves our hands — because your design deserves to be right, not just done.'
              },
              {
                title: 'Radical transparency',
                desc: 'Pricing is clear. Timelines are honest. If something goes wrong, we tell you immediately and fix it. No surprises, no excuses.'
              },
              {
                title: 'Your success is ours',
                desc: 'We\'re not just a print shop. When your prototype succeeds or your project comes to life, we take pride in that too.'
              },
            ].map((value) => (
              <div key={value.title} className="border-l-2 border-amber-400/50 pl-6">
                <h3 className="font-black text-xl mb-3">{value.title}</h3>
                <p className="text-white/50 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">Capabilities</p>
          <h2 className="text-4xl font-black mb-12">What we can do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'FDM printing up to 300×300×400mm build volume',
              'Layer heights from 0.1mm to 0.3mm',
              'PLA, PETG, ABS, ASA, TPU, Nylon materials',
              'Detailed prototypes and functional parts',
              'Post-processing: sanding, priming, painting',
              'Rush orders with 24-hour turnaround',
              'Small batch production runs',
              'File repair and optimization services',
            ].map((cap) => (
              <div key={cap} className="flex items-start gap-3 border border-white/10 rounded-lg p-4">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span className="text-white/70 text-sm">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">Let&apos;s build something together.</h2>
          <p className="text-white/50 mb-8">
            Have a project in mind? We&apos;d love to hear about it.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-amber-400 text-black hover:bg-amber-300 font-bold px-10 h-12"
              asChild
            >
              <Link href="/contact">Get in Touch</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 bg-transparent px-10 h-12"
              asChild
            >
              <Link href="/portfolio">See Our Work</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}