"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Coffee } from "lucide-react";

const GALLERY_IMAGES = [
  { src: "/images/benne-dosa.webp", alt: "Benne Dosa close-up", size: "md:col-span-2 md:row-span-2" },
  { src: "/images/filter-coffee.webp", alt: "Filter Coffee preparation", size: "md:col-span-1 md:row-span-1" },
  { src: "/images/gallery1.webp", alt: "Café interiors", size: "md:col-span-1 md:row-span-1" },
  { src: "/images/thatte-idli.webp", alt: "Freshly made Idli", size: "md:col-span-1 md:row-span-2" },
  { src: "/images/gallery2.webp", alt: "Vada with chutney", size: "md:col-span-1 md:row-span-1" },
  { src: "/images/gallery3.webp", alt: "Happy customers", size: "md:col-span-1 md:row-span-1" },
  { src: "/images/dosa-making.webp", alt: "Authentic Dosa Making", size: "md:col-span-2 md:row-span-1" },
  { src: "/images/gallery4.webp", alt: "Benne Bliss Table", size: "md:col-span-1 md:row-span-1" },
  { src: "/images/uttapam.webp", alt: "Loaded Uttapam", size: "md:col-span-1 md:row-span-1" },
  { src: "/images/ownersimage.webp", alt: "Our Heritage", size: "md:col-span-2 md:row-span-1" },
  { src: "/images/coffee-pour.webp", alt: "The Perfect Pour", size: "md:col-span-2 md:row-span-1" },
  { src: "/images/menu/ghee-podi-benne-dosa.webp", alt: "Spicy Podi Bliss", size: "md:col-span-2 md:row-span-1" },
];

/**
 * Gallery — Optimized, performant gallery with grid masonry-like layout.
 */
export default function Gallery() {
  return (
    <section className="bg-[var(--coffee)] relative overflow-hidden">
      {/* Dark Header Section matching Menu page */}
      <div className="relative pt-16 pb-32">
        <div className="absolute inset-0 css-pattern pointer-events-none opacity-[0.4]" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <h1 className="font-[var(--font-playfair)] text-5xl md:text-8xl font-bold text-white mb-8 tracking-tight">
              Our <span className="text-[var(--benne-primary)] italic underline underline-offset-[12px] decoration-1 decoration-white/20">Gallery</span>
            </h1>
            
            <p className="text-white/60 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
              A visual journey through the soul of Karnataka. From the golden crunch of our dosas to the moments that define our heritage.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Light Background for the Grid */}
      <div className="bg-[var(--cream)] pt-12 pb-12 md:pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[250px] gap-4 md:gap-8 grid-flow-dense relative z-20">
            {GALLERY_IMAGES.map((img, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className={`relative rounded-[2.5rem] overflow-hidden group border-4 border-white shadow-[0_20px_50px_-20px_rgba(58,36,28,0.3)] transition-all duration-500 bg-white ${img.size}`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-8 left-8 text-white translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                  <p className="font-[var(--font-playfair)] text-xl font-bold tracking-tight">{img.alt}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
