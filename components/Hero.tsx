"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Hero component enhanced with Framer Motion.
 * Uses priority loading for the LCP image.
 */
export default function Hero() {
  return (
    <section className="relative h-screen min-h-[700px] w-full overflow-hidden bg-[var(--coffee)]">
      {/* Background with optimized Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/benne-dosa.webp"
          alt="Benne n Beans Café Karnataka flavours"
          fill
          priority
          quality={75}
          className="object-cover opacity-40 scale-110"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[var(--coffee)]" />
      </div>

      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex flex-col justify-center items-start pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="reveal-on-scroll"
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block px-4 py-1.5 rounded-full bg-[var(--benne-primary)]/20 text-[var(--benne-primary)] text-sm font-bold tracking-wider uppercase mb-6 backdrop-blur-sm border border-[var(--benne-primary)]/30"
          >
            Authentic Karnataka Flavours
          </motion.span>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-[var(--font-playfair)] text-5xl md:text-8xl font-bold text-white leading-[1.1] mb-6 max-w-4xl"
          >
            Where Tradition <br />
            <span className="text-[var(--benne-primary)]">Meets the Bean.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg md:text-xl text-white/80 max-w-xl mb-10 leading-relaxed font-light"
          >
            Bringing the soul of Karnataka to Lucknow. Experience the crunch of Benne Dosa and the warmth of real Filter Coffee.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-5"
          >
            <Link 
              href="/menu"
              className="group flex items-center justify-center gap-3 bg-[var(--benne-primary)] text-white px-8 py-4 rounded-full text-lg font-bold shadow-2xl shadow-[var(--benne-primary)]/30 hover:bg-[var(--benne-primary)]/90 transition-all duration-300 hover:translate-y-[-2px]"
            >
              View Menu
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            
            <Link 
              href="/location"
              className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/20 transition-all duration-300"
            >
              <MapPin className="w-5 h-5 text-[var(--benne-primary)]" />
              Visit Us
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
