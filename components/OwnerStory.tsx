"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * OwnerStory — "Why We Started Benne n Beans"
 * Two-column on desktop (image left, text right), stacked on mobile.
 * Soft scroll-reveal animations; warm cream background.
 */

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" as const } },
};

export default function OwnerStory() {
  return (
    <section
      id="owner-story"
      className="section-padding"
      style={{
        background: "linear-gradient(160deg, var(--cream) 0%, #fdf6ee 100%)",
      }}
      aria-labelledby="owner-story-heading"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* Left — image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          style={{ willChange: "transform, opacity" }}
          className="relative"
        >
          <div
            className="relative h-[420px] md:h-[540px] rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 30px 70px rgba(58,36,28,0.18)" }}
          >
            <Image
              src="/images/ownersimage.jpg"
              alt="The founders of Benne n Beans in their restaurant"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Warm tint overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(58,36,28,0.28) 0%, transparent 60%)",
              }}
            />
          </div>

          {/* Floating accent badge */}
          <div
            className="absolute -bottom-5 -right-4 md:-right-6 rounded-2xl px-5 py-4 text-center"
            style={{
              background: "var(--benne-primary)",
              boxShadow: "0 12px 32px rgba(231,111,81,0.38)",
            }}
          >
            <p className="font-[var(--font-playfair)] text-2xl font-bold text-white leading-none">
              2025
            </p>
            <p className="text-white/80 text-xs mt-1 tracking-wide">Since</p>
          </div>
        </motion.div>

        {/* Right — staggered text */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px 0px" }}
          className="flex flex-col gap-5"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block font-semibold tracking-[0.18em] uppercase text-xs"
            style={{ color: "var(--butter-gold)" }}
          >
            Our Founders
          </motion.span>

          <motion.h2
            id="owner-story-heading"
            variants={fadeUp}
            className="font-[var(--font-playfair)] text-3xl md:text-4xl lg:text-[2.6rem] font-bold leading-tight"
            style={{ color: "var(--coffee)" }}
          >
            Why We Started{" "}
            <span style={{ color: "var(--benne-primary)" }}>Benne n Beans</span>
          </motion.h2>

          <div
            className="space-y-4 text-sm sm:text-base leading-relaxed"
            style={{ color: "var(--deep-brown)", opacity: 0.78 }}
          >
            {[
              "Growing up with the flavours of Karnataka, our founders carried a deep love for Davangere-style benne dosa — the kind cooked on well-seasoned cast-iron tawas, slathered in pure white butter, and served piping hot with coconut chutney.",
              "When they moved to Lucknow, they couldn't find a single place that captured that authentic taste. So they decided to build one. Benne n Beans was born from a simple mission: bring the real Karnataka street-food experience to the City of Nawabs.",
              "Every item on our menu — from the butter-drenched dosas to the slow-dripped filter coffee — reflects our obsession with staying true to tradition. No shortcuts. No compromises. Just honest, soulful food cooked with passion.",
            ].map((para, i) => (
              <motion.p key={i} variants={fadeUp}>{para}</motion.p>
            ))}
          </div>

          {/* Values row */}
          <motion.div variants={fadeUp} className="mt-4 grid grid-cols-3 gap-4">
            {[
              { icon: "🌿", label: "Authentic" },
              { icon: "🔥", label: "Passionate" },
              { icon: "🫶", label: "Soulful" },
            ].map((val) => (
              <div
                key={val.label}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-center"
                style={{ background: "rgba(231,111,81,0.07)" }}
              >
                <span className="text-xl" aria-hidden="true">{val.icon}</span>
                <span
                  className="text-xs font-semibold tracking-wide uppercase"
                  style={{ color: "var(--coffee)" }}
                >
                  {val.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
