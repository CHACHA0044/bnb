"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Coffee } from "lucide-react";

/**
 * CoffeeSection — highlights the traditional South Indian
 * filter coffee with imagery and descriptive text.
 */
export default function CoffeeSection() {
  return (
    <section
      className="section-padding text-white overflow-hidden"
      style={{
        background: "linear-gradient(145deg, var(--coffee) 0%, #1e0e08 100%)",
      }}
      aria-labelledby="coffee-heading"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex justify-center order-2 md:order-1"
        >
          <div
            className="relative w-72 h-96 md:w-80 md:h-[460px] rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}
          >
            <Image
              src="/images/coffee-pour.jpg"
              alt="Traditional South Indian filter coffee being poured"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 288px, 320px"
            />
            {/* Bottom gradient */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(30,14,8,0.50) 0%, transparent 60%)",
              }}
            />
          </div>

          {/* Decorative steam lines */}
          <div
            aria-hidden="true"
            className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2"
          >
            {[0, 0.4, 0.8].map((d, i) => (
              <span
                key={i}
                className="block w-1.5 h-6 rounded-full bg-white/20 animate-steam"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.42, delay: 0.08, ease: "easeOut" }}
          style={{ willChange: "transform, opacity" }}
          className="order-1 md:order-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <Coffee className="text-[var(--butter-gold)]" size={26} />
            <span className="text-[var(--butter-gold)] font-semibold tracking-[0.18em] uppercase text-xs">
              Brewed with Tradition
            </span>
          </div>

          <h2
            id="coffee-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold mb-7"
          >
            South Indian Filter Coffee
          </h2>

          <div className="space-y-4 text-white/76 text-sm sm:text-base leading-relaxed">
            <p>
              Our filter coffee begins with a carefully selected blend of
              dark-roasted Arabica and Chicory beans, ground fresh every
              morning. The decoction drips slowly through a traditional brass
              filter, extracting every note of rich, earthy aroma.
            </p>
            <p>
              Served piping hot in a stainless-steel tumbler and davara, the
              coffee is frothy, bold, and deeply satisfying — just the way it
              has been enjoyed across South India for generations.
            </p>
            <p>
              Pair it with a crispy Benne Dosa or a warm Thatte Idli for the
              ultimate South Indian breakfast experience.
            </p>
          </div>

          {/* Highlight pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            {["Freshly Ground", "Brass Filter Brewed", "Frothy & Bold"].map(
              (tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 rounded-full text-[var(--butter-gold)] text-sm font-medium"
                  style={{
                    border: "1px solid rgba(244,162,97,0.45)",
                    background: "rgba(244,162,97,0.06)",
                  }}
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
