"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { SIGNATURE_ITEMS } from "@/lib/constants";

/**
 * SignatureItems — 4-card grid showcasing hero dishes.
 * Staggered scroll reveal + lift/shadow/scale hover effect.
 */
const cardVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.14, duration: 0.55 },
  }),
};

export default function SignatureItems() {
  return (
    <section className="section-padding bg-white" aria-labelledby="sig-heading">
      <div className="max-w-7xl mx-auto text-center">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14"
        >
          <span className="inline-block text-[var(--butter-gold)] font-semibold tracking-[0.18em] uppercase text-xs mb-3">
            Chef&apos;s Picks
          </span>
          <h2
            id="sig-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold text-[var(--coffee)] mb-4"
          >
            Our Signature Dishes
          </h2>
          <p className="text-[var(--text)]/60 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Handpicked classics that define the soul of South Indian cuisine —
            each prepared fresh, every single time.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {SIGNATURE_ITEMS.map((item, i) => (
            <motion.article
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="group rounded-2xl overflow-hidden bg-[var(--cream)] shadow-[0_4px_20px_rgba(0,0,0,0.07)] hover:shadow-[0_20px_48px_rgba(0,0,0,0.13)] transition-all duration-300 ease-out cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Body */}
              <div className="p-5 text-left">
                <h3 className="font-[var(--font-playfair)] text-lg font-semibold text-[var(--coffee)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text)]/65 leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-4 h-0.5 w-0 group-hover:w-10 rounded-full bg-[var(--benne-primary)] transition-all duration-500" />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
