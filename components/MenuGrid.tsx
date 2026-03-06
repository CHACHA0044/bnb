"use client";

import { motion } from "framer-motion";
import { MENU_ITEMS } from "@/lib/constants";
import { useEffect, useState } from "react";

/** Hook to detect mobile viewport */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

/**
 * MenuGrid — displays all menu items in a responsive 3-col card grid.
 * Staggered reveal + lift-on-hover with soft shadow depth.
 */
export default function MenuGrid() {
  const isMobile = useIsMobile();

  return (
    <section
      id="menu"
      className="section-padding bg-white"
      aria-labelledby="menu-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: isMobile ? 1 : 0, y: isMobile ? 0 : 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: isMobile ? 0.2 : 0.4 }}
          className="text-center mb-14"
        >
          <span className="text-[var(--butter-gold)] font-semibold tracking-[0.18em] uppercase text-xs">
            Explore
          </span>
          <h2
            id="menu-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold text-[var(--coffee)] mt-2 mb-4"
          >
            Our Menu
          </h2>
          <p className="text-[var(--text)]/60 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            From crispy dosas to frothy filter coffee — every item is crafted
            fresh with authentic South Indian recipes.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MENU_ITEMS.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: isMobile ? 1 : 0, y: isMobile ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: isMobile ? 0 : i * 0.03, duration: isMobile ? 0.15 : 0.3, ease: "easeOut" }}
              whileHover={isMobile ? undefined : { y: -5, scale: 1.01 }}
              className="group relative rounded-xl bg-[var(--cream)] p-6
                shadow-[0_2px_12px_rgba(0,0,0,0.06)]
                md:hover:shadow-[0_12px_32px_rgba(0,0,0,0.11)]
                transition-shadow duration-300
                border border-[var(--butter-gold)]/12 overflow-hidden"
            >
              {/* Category badge */}
              <span className="inline-block text-xs font-semibold tracking-wider uppercase text-[var(--leaf)] bg-[var(--leaf)]/10 px-3 py-1 rounded-full mb-3">
                {item.category}
              </span>

              <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[var(--coffee)] mb-1.5">
                {item.name}
              </h3>
              <p className="text-sm text-[var(--text)]/60 mb-5 leading-relaxed">
                {item.description}
              </p>

              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-[var(--benne-primary)]">
                  {item.price}
                </p>
                {/* Animated underline */}
                <div className="h-0.5 w-0 md:group-hover:w-8 rounded-full bg-[var(--benne-primary)] transition-all duration-400" />
              </div>

              {/* Decorative corner accent */}
              <div
                aria-hidden="true"
                className="absolute top-0 right-0 w-16 h-16 bg-[var(--benne-primary)]/5 rounded-bl-[3rem] transition-all duration-300 md:group-hover:bg-[var(--benne-primary)]/12"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
