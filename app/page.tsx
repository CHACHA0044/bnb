"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SignatureItems from "@/components/SignatureItems";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Clean Homepage with consistent reveal animations.
 */
export default function Home() {
  const revealVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <Hero />
        <SignatureItems />

        {/* Dedicated Menu CTA Section */}
        <section className="py-20 md:py-32 relative overflow-hidden group">
          <div className="absolute inset-0">
            <Image 
              src="/images/menu/plain-benne-dosa.webp" 
              alt="Dosa Background" 
              fill 
              className="object-cover brightness-[0.3] transition-transform duration-[3s] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)] via-[var(--coffee)]/60 to-transparent" />
          </div>
          
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={revealVariants}
              className="reveal-on-scroll"
            >
              <h2 className="font-[var(--font-playfair)] text-4xl md:text-7xl font-bold text-white mb-6 md:mb-8 tracking-tight">
                Explore Our <br className="md:hidden" />
                <span className="text-[var(--benne-primary)] italic">Full Collection</span>
              </h2>
              <p className="text-white/70 text-base md:text-xl mb-8 md:mb-12 font-light leading-relaxed max-w-xl mx-auto">
                From our signature Benne Dosas to our authentic Filter Coffee, discover the complete taste of Karnataka.
              </p>
              <Link
                href="/menu"
                className="inline-flex items-center gap-3 bg-[var(--benne-primary)] text-white px-8 py-4 md:px-12 md:py-6 rounded-full text-lg md:text-xl font-bold shadow-2xl shadow-[var(--benne-primary)]/40 hover:scale-105 transition-all duration-300"
              >
                View Dedicated Menu <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Story CTA — Modern Grid Layout */}
        <section className="py-20 md:py-32 bg-[var(--cream)] overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative aspect-[4/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(58,36,28,0.2)] border-4 md:border-8 border-white reveal-on-scroll"
              >
                <Image 
                  src="/images/ownersimage.webp" 
                  alt="Our Heritage" 
                  fill 
                  className="object-cover"
                />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-6 md:space-y-8 reveal-on-scroll"
              >
                <div className="flex items-center gap-4">
                  <div className="h-[1px] w-12 bg-[var(--benne-primary)]" />
                  <span className="text-[var(--benne-primary)] font-black tracking-[0.4em] uppercase text-[10px]">Our Heritage</span>
                </div>
                <h3 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-bold text-[var(--coffee)] leading-tight">
                  Born in Karnataka, <br className="md:hidden" />
                  <span className="italic">Serving in Lucknow.</span>
                </h3>
                <p className="text-[var(--coffee)]/60 text-base md:text-xl font-light leading-relaxed">
                  Discover the story of passion, butter, and authentic flavors that brought the heart of Davangere to the City of Nawabs.
                </p>
                <Link 
                  href="/story" 
                  className="inline-flex items-center gap-3 text-[var(--coffee)] font-bold text-lg group"
                >
                  <span className="border-b-2 border-[var(--benne-primary)] pb-1 group-hover:bg-[var(--benne-primary)] group-hover:text-white transition-all duration-300 px-2">Read Our Full Story</span>
                  <ArrowRight className="text-[var(--benne-primary)] group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
