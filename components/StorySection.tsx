"use client";

import Image from "next/image";
import { motion } from "framer-motion";
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
 * StorySection — two-column layout telling the brand story.
 * Image on left, narrative on right. Stacks on mobile.
 */
export default function StorySection() {
  const isMobile = useIsMobile();

  return (
    <section
      id="story"
      className="section-padding bg-[var(--cream)]"
      aria-labelledby="story-heading"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Image */}
        <motion.div
          initial={{ opacity: isMobile ? 1 : 0, x: isMobile ? 0 : -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: isMobile ? 0.2 : 0.5 }}
          className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-lg"
        >
          <Image
            src="/images/ownersimage.jpg"
            alt="Founders of Benne n Beans"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: isMobile ? 1 : 0, x: isMobile ? 0 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: isMobile ? 0.2 : 0.5 }}
        >
          <span className="text-[var(--gold)] font-medium tracking-widest uppercase text-sm">
            Our Story
          </span>
          <h2
            id="story-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold text-[var(--coffee)] mt-2 mb-6"
          >
            From Davangere to Lucknow
          </h2>
          <div className="space-y-4 text-[var(--text)]/80 leading-relaxed">
            <p>
              Benne Dosa was born in the bustling streets of Davangere,
              Karnataka — where roadside vendors perfected the art of
              butter-soaked dosas cooked to golden crispness on seasoned
              cast-iron tawas.
            </p>
            <p>
              At <strong className="text-[var(--coffee)]">Benne n Beans</strong>,
              we brought that tradition to Lucknow — pairing it with aromatic
              South Indian filter coffee, fluffy Thatte Idli, and the warmth of
              an authentic café experience.
            </p>
            <p>
              Every dish is prepared with love, using time-honoured recipes and
              the freshest ingredients. We believe food should be soulful,
              honest, and unforgettable.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 flex gap-8">
            {[
              { value: "1K+", label: "Happy Customers" },
              { value: "15+", label: "Dishes" },
              { value: "5★", label: "Google Rating" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--primary)]">
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--text)]/60 mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
