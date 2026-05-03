"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const SIGNATURE_ITEMS = [
  {
    name: "Plain Benne Dosa",
    image: "/images/benne-dosa.webp",
    description: "The golden crunch of Davangere style butter dosa.",
  },
  {
    name: "Filter Coffee",
    image: "/images/filter-coffee.webp",
    description: "Classic brass tumbler coffee, frothed to perfection.",
  },
  {
    name: "Thatte Idli",
    image: "/images/thatte-idli.webp",
    description: "Soft, plate-sized idli served with butter and spicy podi.",
  },
];

/**
 * SignatureItems enhanced with Framer Motion and premium aesthetics.
 * Prices removed per user request for Home Page.
 */
export default function SignatureItems() {
  return (
    <section className="section-padding bg-[var(--cream)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h2 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-bold text-[var(--coffee)] mb-4 leading-tight">
              Our <span className="text-[var(--benne-primary)] italic">Signatures</span>
            </h2>
            <p className="text-[var(--coffee)]/70 text-lg md:text-xl font-light">
              The dishes that define us. Crafted with authentic ingredients sourced directly from Karnataka.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link 
              href="/menu" 
              className="flex items-center gap-2 text-[var(--benne-primary)] font-bold group border-b-2 border-transparent hover:border-[var(--benne-primary)] transition-all pb-1 text-lg"
            >
              View Full Menu 
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {SIGNATURE_ITEMS.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-[0_10px_40px_-15px_rgba(58,36,28,0.1)] hover:shadow-[0_40px_80px_-20px_rgba(58,36,28,0.15)] transition-all duration-700 border border-[var(--coffee)]/5 hover:translate-y-[-8px] reveal-on-scroll"
            >
              <div className="relative h-80 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-[1.5s] cubic-bezier(0.16, 1, 0.3, 1) group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              
              <div className="p-10 relative">
                <h3 className="font-[var(--font-playfair)] text-2xl md:text-3xl font-bold text-[var(--coffee)] mb-4">
                  {item.name}
                </h3>
                <p className="text-[var(--coffee)]/60 text-base leading-relaxed mb-8 font-light">
                  {item.description}
                </p>
                
                <a 
                  href="https://www.zomato.com/lucknow/benne-n-beans-3-aashiana/order"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 py-3 px-6 rounded-full bg-[var(--cream)] text-[var(--coffee)] font-bold text-sm group/btn hover:bg-[var(--benne-primary)] hover:text-white transition-all duration-300 shadow-sm"
                >
                  Order Now 
                  <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
