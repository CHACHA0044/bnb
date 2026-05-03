"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    title: "Natural Fermentation",
    desc: "Our batter undergoes 12 hours of natural fermentation to achieve that distinct, authentic tang.",
  },
  {
    number: "02",
    title: "Artisanal Benne",
    desc: "We use signature Davangere butter that melts into the dosa, creating a gold-standard crunch.",
  },
  {
    number: "03",
    title: "Cast-Iron Mastery",
    desc: "Every dosa is hand-poured on seasoned cast-iron griddles for that perfect, even heat distribution.",
  },
];

/**
 * DosaProcess — High-end process section with staggered animations.
 */
export default function DosaProcess() {
  return (
    <section className="pt-20 pb-12 md:pb-24 bg-[var(--cream)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          {/* Content Column */}
          <div className="order-2 lg:order-1 space-y-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--coffee)] leading-tight">
                The Craft of the <br />
                <span className="text-[var(--benne-primary)] italic underline underline-offset-8 decoration-1">Perfect Crunch.</span>
              </h2>
              <p className="text-[var(--coffee)]/50 text-lg font-light max-w-md leading-relaxed">
                We believe in the slow way. The right way. No shortcuts, just the pure soul of Karnataka.
              </p>
            </motion.div>

            <div className="space-y-10">
              {STEPS.map((step, idx) => (
                <motion.div 
                  key={step.number} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className="group flex gap-10 items-start"
                >
                  <div className="shrink-0 font-[var(--font-playfair)] text-6xl font-black text-[var(--benne-primary)]/15 group-hover:text-[var(--benne-primary)]/50 transition-all duration-700 select-none">
                    {step.number}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl font-bold text-[var(--coffee)] mb-3 group-hover:text-[var(--benne-primary)] transition-colors duration-500">
                      {step.title}
                    </h3>
                    <p className="text-[var(--coffee)]/60 leading-relaxed text-sm lg:text-base font-light max-w-sm">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Visual Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="order-1 lg:order-2 relative aspect-[4/5] lg:aspect-square rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(58,36,28,0.15)] group border-[12px] border-white"
          >
            <Image
              src="/images/dosa-making.webp"
              alt="Dosa preparation process"
              fill
              className="object-cover transition-transform duration-[2000ms] group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)]/60 via-transparent to-transparent opacity-60" />
            
            <div className="absolute bottom-12 left-12 right-12 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-[1px] flex-1 bg-white/30" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Authentic Mastery</span>
              </div>
              <p className="font-[var(--font-playfair)] text-3xl font-bold italic">No shortcuts, just soul.</p>
            </div>

          </motion.div>

        </div>
      </div>
    </section>
  );
}
