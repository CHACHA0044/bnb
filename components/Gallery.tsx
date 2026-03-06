"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { GALLERY_IMAGES } from "@/lib/constants";

/**
 * Gallery — responsive masonry-style image grid.
 * Hover: overlay fade-in + label + subtle zoom.
 * Scroll: staggered fade-in per card.
 */
export default function Gallery() {
  return (
    <section
      id="gallery"
      className="section-padding bg-[var(--cream)]"
      aria-labelledby="gallery-heading"
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
          <span className="inline-block text-[var(--butter-gold)] font-semibold tracking-[0.18em] uppercase text-xs mb-3">
            Snapshots
          </span>
          <h2
            id="gallery-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold text-[var(--coffee)] mb-4"
          >
            Gallery
          </h2>
          <p className="text-[var(--text)]/60 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            A glimpse into the sizzling tawas, aromatic coffee, and the vibrant
            atmosphere at Benne n Beans.
          </p>
        </motion.div>

        {/* Grid — first card spans 2 rows on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {GALLERY_IMAGES.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.09, duration: 0.5, ease: "easeOut" }}
              className={`group relative overflow-hidden rounded-2xl cursor-pointer
                shadow-[0_4px_16px_rgba(0,0,0,0.09)]
                hover:shadow-[0_16px_40px_rgba(0,0,0,0.16)]
                transition-shadow duration-300
                ${i === 0 ? "md:row-span-2" : ""}`}
            >
              <div className={`relative overflow-hidden ${i === 0 ? "h-64 md:h-full min-h-[280px]" : "h-48 md:h-56"}`}>
                <Image
                  src={src}
                  alt={`Benne n Beans — gallery photo ${i + 1}`}
                  fill
                  className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                  style={{ transitionDuration: "500ms", transform: "scale(1)" }}
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>

              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2
                  bg-[var(--coffee)]/0 group-hover:bg-[var(--coffee)]/55
                  transition-colors duration-350"
              >
                <span
                  className="text-white font-semibold text-sm tracking-widest uppercase
                    opacity-0 group-hover:opacity-100
                    translate-y-3 group-hover:translate-y-0
                    transition-all duration-300"
                >
                  @bennenbeans
                </span>
                <div
                  className="w-8 h-0.5 bg-[var(--benne-primary)] rounded-full
                    opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100
                    transition-all duration-350 delay-75"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
