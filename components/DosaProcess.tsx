"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { DOSA_PROCESS } from "@/lib/constants";

/**
 * DosaProcess — step-by-step visual walkthrough of how
 * Benne Dosa is made, with staggered scroll animations.
 */
export default function DosaProcess() {
  return (
    <section
      className="section-padding text-white overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--coffee) 0%, #2a160f 100%)",
      }}
      aria-labelledby="process-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14"
        >
          <span className="text-[var(--butter-gold)] font-semibold tracking-[0.18em] uppercase text-xs">
            The Craft
          </span>
          <h2
            id="process-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold mt-3"
          >
            How We Make Benne Dosa
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Steps */}
          <div className="space-y-7">
            {DOSA_PROCESS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.13, duration: 0.5, ease: "easeOut" }}
                className="flex gap-5 group"
              >
                {/* Step number circle */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: "var(--benne-primary)",
                    boxShadow: "0 6px 20px rgba(231,111,81,0.35)",
                  }}
                >
                  {step.step}
                </div>
                <div>
                  <h3 className="font-[var(--font-playfair)] text-lg font-semibold mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-white/68 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative h-[400px] md:h-[520px] rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 30px 60px rgba(0,0,0,0.35)" }}
          >
            <Image
              src="/images/dosa-making.jpg"
              alt="Dosa being prepared on a cast iron tawa"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(58,36,28,0.55) 0%, transparent 55%)",
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
