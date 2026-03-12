import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';

const display = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const mono    = JetBrains_Mono({ weight: ['400', '600'], subsets: ['latin'] });

// ─── Data ─────────────────────────────────────────────────────────────────────

const VALUES = [
  {
    n:     '01',
    title: 'Precision over speed',
    desc:  'We could rush every job. We choose not to. Every print is checked before it leaves our hands — because your design deserves to be right, not just done.',
  },
  {
    n:     '02',
    title: 'Radical transparency',
    desc:  'Pricing is clear. Timelines are honest. If something goes wrong, we tell you immediately and fix it. No surprises, no excuses.',
  },
  {
    n:     '03',
    title: 'Your success is ours',
    desc:  "We're not just a print shop. When your prototype succeeds or your project comes to life, we take pride in that too.",
  },
];

const CAPABILITIES = [
  { label: 'Build volume',    value: 'Up to 300 × 300 × 400 mm'          },
  { label: 'Layer height',    value: '0.1 mm – 0.3 mm'                   },
  { label: 'Materials',       value: 'PLA, PETG, ABS, ASA, TPU, Nylon'  },
  { label: 'Technologies',    value: 'FDM · SLA (coming soon)'           },
  { label: 'Post-processing', value: 'Sanding, priming, painting'        },
  { label: 'Rush turnaround', value: '24-hour orders available'          },
  { label: 'Production runs', value: 'Small batch manufacturing'         },
  { label: 'File services',   value: 'Repair, optimisation, conversion'  },
];

const STATS = [
  { value: '0.1mm',  label: 'Min layer height' },
  { value: '2024',   label: 'Est.'             },
  { value: '8+',     label: 'Materials'        },
  { value: 'NoCo',   label: 'Loveland, CO'     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="pt-16 bg-[#0d0a06]">

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="relative py-32 px-6 border-b border-white/10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.3em] text-amber-400/70 mb-6`}>
              Our Story
            </p>
            <h1
              className={`${display.className} text-white leading-[0.88] mb-8`}
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
            >
              WE MAKE<br />
              IDEAS<br />
              <span className="text-amber-400">TANGIBLE.</span>
            </h1>
            <p className="text-white/58 text-lg leading-relaxed max-w-lg">
              NoCo Make Lab started as a passion for turning digital designs into
              physical objects. What began as a single printer in a garage is now
              a dedicated shop serving engineers, designers, hobbyists, and makers
              right here in Loveland, Colorado.
            </p>
          </div>

          {/* Stats block */}
          <div className="grid grid-cols-2 gap-px bg-white/8 lg:ml-auto lg:w-80">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bg-[#0d0a06] p-8 flex flex-col justify-between gap-3">
                <div className={`${display.className} text-amber-400 leading-none`}
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
                  {value}
                </div>
                <p className={`${mono.className} text-[9px] uppercase tracking-[0.25em] text-white/30`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════ VALUES ════════════════════════════ */}
      <section className="py-28 px-6 border-b border-white/10 bg-[#0b0907]">
        <div className="max-w-7xl mx-auto">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
            What drives us
          </p>
          <h2
            className="font-black tracking-tight leading-[1.15] mb-16"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}
          >
            Three things we<br />won&apos;t compromise on.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/8">
            {VALUES.map((v) => (
              <div key={v.n} className="relative bg-[#0b0907] p-8 group hover:bg-white/[0.02] transition-colors overflow-hidden">
                {/* Ghost number */}
                <div
                  className={`${display.className} absolute -bottom-2 -right-1 text-white/[0.04] pointer-events-none select-none leading-none`}
                  style={{ fontSize: '8rem' }}
                >
                  {v.n}
                </div>
                <div className="relative">
                  <div className="w-6 h-0.5 bg-amber-400/30 mb-6 group-hover:w-14 group-hover:bg-amber-400 transition-all duration-300" />
                  <p className={`${mono.className} text-[10px] uppercase tracking-[0.22em] text-amber-400/55 mb-3`}>
                    {v.n}
                  </p>
                  <h3 className="font-black text-xl mb-4 tracking-tight" style={{ fontFamily: 'var(--font-epilogue)' }}>
                    {v.title}
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════ CAPABILITIES ════════════════════════════ */}
      <section className="py-28 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
            Capabilities
          </p>
          <h2
            className="font-black tracking-tight leading-[1.15] mb-16"
            style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}
          >
            What we<br />can do.
          </h2>

          {/* Table-style capability list */}
          <div className="border border-white/8">
            {/* Header */}
            <div className="grid grid-cols-2 border-b border-white/8 px-6 py-2">
              <p className={`${mono.className} text-[8.5px] uppercase tracking-[0.25em] text-white/22`}>Capability</p>
              <p className={`${mono.className} text-[8.5px] uppercase tracking-[0.25em] text-white/22`}>Detail</p>
            </div>
            {CAPABILITIES.map((cap, i) => (
              <div
                key={cap.label}
                className={`grid grid-cols-2 px-6 py-4 items-center hover:bg-white/[0.025] transition-colors ${
                  i < CAPABILITIES.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <p className={`${mono.className} text-[10px] uppercase tracking-[0.18em] text-white/35`}>
                  {cap.label}
                </p>
                <p className="text-white/75 text-sm font-medium" style={{ fontFamily: 'var(--font-epilogue)' }}>
                  {cap.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════ STORY ════════════════════════════ */}
      <section className="py-28 px-6 border-b border-white/10 bg-[#0b0907]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className={`${mono.className} text-[10px] uppercase tracking-[0.28em] text-amber-400/70 mb-5`}>
              The shop
            </p>
            <h2
              className="font-black tracking-tight leading-[1.15] mb-8"
              style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)' }}
            >
              One shop.<br />One standard.
            </h2>
          </div>
          <div className="space-y-5 text-white/55 text-sm leading-relaxed lg:pt-24">
            <p>
              Every order that goes out the door has been touched by the same hands that
              configured the printer, dialled in the settings, and checked the result.
              There&apos;s no handoff to a fulfilment warehouse — just a person who cares about
              the quality of what they ship.
            </p>
            <p>
              Being a one-person operation means we can be honest about capacity and
              timelines. We won&apos;t take on more than we can do well. If we&apos;re at capacity,
              we&apos;ll tell you upfront rather than let your job sit in a queue.
            </p>
            <p>
              We&apos;re based in Loveland, CO — Northern Colorado&apos;s engineering and maker
              community is our backyard. Local pickup is always available, and local
              customers get priority support.
            </p>
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
              Let&apos;s build something
            </p>
            <h2
              className={`${display.className} text-black leading-[0.88]`}
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}
            >
              HAVE A<br />PROJECT<br />IN MIND?
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="hidden md:block text-black/50 text-sm max-w-xs text-right leading-relaxed">
              Reach out with what you&apos;re working on — even a rough idea is enough to start.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className={`${mono.className} inline-flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-[0.18em] font-semibold px-8 h-12 hover:bg-zinc-900 transition-colors`}
              >
                Get in Touch <ArrowRight className="h-3.5 w-3.5" />
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