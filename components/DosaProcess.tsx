import Image from "next/image";

const STEPS = [
  {
    number: "01",
    title: "The Fermentation",
    desc: "12 hours of natural fermentation ensures the perfect tang and fluffiness.",
  },
  {
    number: "02",
    title: "The Benne",
    desc: "Pure, artisanal butter sourced to give that signature Davangere crunch.",
  },
  {
    number: "03",
    title: "The Heat",
    desc: "Cast-iron griddles maintained at exact temperatures for consistent gold.",
  },
];

/**
 * DosaProcess refactored as a Server Component.
 * Optimized performance: replaced viewport-triggered Framer Motion with static layout.
 */
export default function DosaProcess() {
  return (
    <section className="section-padding bg-[var(--cream)]/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--coffee)] mb-6">
            The Craft of the <span className="text-[var(--benne-primary)] italic">Perfect Crunch</span>
          </h2>
          <div className="w-24 h-1 bg-[var(--benne-primary)] mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="grid grid-cols-1 gap-12">
            {STEPS.map((step) => (
              <div key={step.number} className="group flex gap-8">
                <div className="shrink-0 font-[var(--font-playfair)] text-5xl font-black text-[var(--benne-primary)]/10 group-hover:text-[var(--benne-primary)]/30 transition-colors duration-500">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--coffee)] mb-2">{step.title}</h3>
                  <p className="text-[var(--coffee)]/60 leading-relaxed text-sm max-w-sm">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative aspect-video lg:aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-[var(--coffee)]/10">
            <Image
              src="/images/dosa-making.webp"
              alt="Dosa preparation process"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)]/40 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <p className="font-[var(--font-playfair)] text-2xl font-bold mb-1">Authentic Process</p>
              <p className="text-sm opacity-80 uppercase tracking-widest">No shortcuts, just soul.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
