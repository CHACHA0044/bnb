"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { GALLERY_IMAGES, RESTAURANT_INFO } from "@/lib/constants";

const INSTA = RESTAURANT_INFO.socials.instagram;

export default function Gallery() {
  return (
    <section
      id="gallery"
      className="section-padding content-auto bg-[var(--cream)]"
      aria-labelledby="gallery-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.45 }}
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
            <motion.a
              key={src}
              href={INSTA}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View on Instagram — Benne n Beans photo ${i + 1}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px 0px" }}
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
                  loading="lazy"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>

              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2
                  bg-[var(--coffee)]/0 group-hover:bg-[var(--coffee)]/60
                  transition-colors duration-300"
              >
                <Instagram
                  size={22}
                  className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0"
                />
                <span
                  className="text-white font-semibold text-sm tracking-widest uppercase
                    opacity-0 group-hover:opacity-100
                    translate-y-3 group-hover:translate-y-0
                    transition-all duration-300 delay-75"
                >
                  @bennenbeans
                </span>
                <div
                  className="w-8 h-0.5 bg-[var(--benne-primary)] rounded-full
                    opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100
                    transition-all duration-300 delay-100"
                />
              </div>
            </motion.a>
          ))}
        </div>

        {/* Instagram CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px 0px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <a
            href={INSTA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-semibold text-sm text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)",
              boxShadow: "0 8px 28px rgba(253,29,29,0.30)",
            }}
          >
            <Instagram size={17} />
            Follow us on Instagram
          </a>
        </motion.div>
      </div>
    </section>
  );
}
