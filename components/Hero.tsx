"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Hero — full-viewport landing section.
 * Text stagger reveal + floating circular image.
 * Warm gradient overlay using the updated color palette.
 * Mobile-optimized: shows content immediately, no counting animation.
 */

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

const containerVariants = {
  hidden: {},
  visible: (isMobile: boolean) => ({
    transition: {
      staggerChildren: isMobile ? 0 : 0.12,
      delayChildren: isMobile ? 0 : 0.1
    },
  }),
};

const itemVariants = {
  hidden: (isMobile: boolean) => ({
    opacity: isMobile ? 1 : 0,
    y: isMobile ? 0 : 24
  }),
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function Hero() {
  const isMobile = useIsMobile();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background image layer */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/benne-dosa.webp"
          alt="Benne Dosa being prepared on a cast iron tawa"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Directional overlay — darkens only the text side, photo breathes on the right */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(28,12,4,0.78) 0%, rgba(28,12,4,0.55) 38%, rgba(28,12,4,0.15) 62%, transparent 80%)",
          }}
        />
        {/* Warm tint layer — ties text colours to background warmth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(180,80,20,0.08) 0%, transparent 50%, rgba(180,80,20,0.12) 100%)",
          }}
        />
      </div>

      {/* Steam effect — purely decorative */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 right-[12%] flex gap-3 hidden md:flex"
      >
        {[0, 0.5, 1].map((delay, i) => (
          <span
            key={i}
            className="block w-2 h-10 rounded-full bg-white/15 animate-steam"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-32 pb-20 md:py-0 grid md:grid-cols-2 gap-10 lg:gap-16 items-center w-full">

        {/* Left — staggered text reveal */}
        <motion.div
          variants={containerVariants}
          custom={isMobile}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start"
        >
          <motion.span
            variants={itemVariants}
            custom={isMobile}
            className="inline-block font-bold tracking-[0.25em] uppercase text-xs sm:text-sm mb-6 px-4 py-2 rounded-full text-white"
            style={{
              background: "linear-gradient(45deg, var(--benne-primary), var(--rustic-orange))",
              boxShadow: "0 4px 16px rgba(231,111,81,0.35)",
            }}
          >
            Since 2025 — Lucknow
          </motion.span>

          <motion.h1
            variants={itemVariants}
            custom={isMobile}
            className="font-[var(--font-playfair)] text-4xl sm:text-6xl lg:text-[4rem] xl:text-7xl font-black leading-[1.1] mb-7"
            style={{
              color: "rgba(255,248,240,0.97)",
              textShadow: "0 2px 12px rgba(20,8,2,0.45)",
            }}
          >
            Authentic<br />
            <span
              style={{
                background: "linear-gradient(120deg, #FFD580 0%, #F4A261 55%, #E8855A 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Benne Dosa
            </span>
            <br />
            <span>in Lucknow</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            custom={isMobile}
            className="text-base sm:text-xl max-w-lg mb-10 leading-relaxed font-medium"
            style={{
              color: "rgba(255,238,218,0.90)",
              textShadow: "0 1px 6px rgba(20,8,2,0.4)",
            }}
          >
            Crispy, buttery, and soulful — experience the taste of Karnataka
            right here in the City of Nawabs. Handcrafted on cast-iron tawas
            with love.
          </motion.p>

          <motion.div variants={itemVariants} custom={isMobile} className="flex flex-wrap gap-5">
            <a
              href="#menu"
              className="inline-flex items-center px-8 py-4 rounded-full font-bold text-base text-white transition-all duration-300 active:scale-95"
              style={{
                background: "linear-gradient(45deg, var(--benne-primary), var(--rustic-orange))",
                boxShadow: "0 8px 32px rgba(231,111,81,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(231,111,81,0.6), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(231,111,81,0.5), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
            >
              View Menu
            </a>
            <a
              href="#location"
              className="inline-flex items-center px-8 py-4 rounded-full font-bold text-base text-white transition-all duration-300 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.3)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.25)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0px)";
              }}
            >
              Visit Us
            </a>
          </motion.div>

          {/* Quick stats bar - static values on mobile for performance */}
          <motion.div
            variants={itemVariants}
            custom={isMobile}
            className="mt-14 flex items-center gap-10"
          >
            {[
              { value: "1K+", label: "Happy Guests" },
              { value: "15+", label: "Dishes" },
              { value: "5★", label: "Rating" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-black mb-1"
                  style={{
                    background: "linear-gradient(45deg, var(--butter-gold), var(--benne-primary))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-xs sm:text-sm font-semibold tracking-wider uppercase"
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right — floating hero image (desktop only) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.5 }}
          className="hidden md:flex justify-center"
        >
          <div
            className="relative w-72 h-72 lg:w-[22rem] lg:h-[22rem] xl:w-96 xl:h-96 rounded-full animate-float"
            style={{
              padding: "3px",
              background: "linear-gradient(135deg, #FFD580 0%, #F4A261 50%, #E76F51 100%)",
              boxShadow:
                "0 0 0 8px rgba(244,162,97,0.12), 0 20px 60px rgba(231,111,81,0.45), 0 0 100px rgba(231,111,81,0.18)",
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden relative">
              <Image
                src="/images/benne-dosa.webp"
                alt="Golden crispy Benne Dosa"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 288px, 384px"
              />
              {/* Faint inner vignette so edges merge with the glow */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: "inset 0 0 40px rgba(0,0,0,0.25)",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: "linear-gradient(to top, var(--cream) 0%, transparent 100%)",
        }}
      />
    </section>
  );
}
