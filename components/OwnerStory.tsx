"use client";

import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Quote } from "lucide-react";

/**
 * OwnerStory — Premium heritage story layout.
 * Optimized for mobile with smooth stagger animations and refined typography.
 */
export default function OwnerStory() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start"
        >
          
          {/* Photo Column - spans 5 cols */}
          <motion.div variants={itemVariants} className="lg:col-span-5 relative group">
            <div className="relative z-20 rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(58,36,28,0.3)] border-[12px] border-white transition-transform duration-700 hover:scale-[1.02]">
              <Image
                src="/images/ownersimage.webp"
                alt="The founders of Benne n Beans"
                width={800}
                height={1000}
                className="w-full h-auto object-cover aspect-[4/5]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)]/20 to-transparent pointer-events-none" />
            </div>
            
            {/* The Heritage Badge - Repositioned for better balance */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute -bottom-10 -right-6 md:-right-12 z-30 bg-[#3A241C] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border-4 border-white text-center"
            >
              <p className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--benne-primary)]">10+</p>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 leading-none mt-2">
                Years of <br /> Heritage
              </p>
            </motion.div>

            {/* Decorative background circle */}
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-[var(--benne-primary)]/5 rounded-full blur-3xl -z-10" />
          </motion.div>

          {/* Text Column - spans 7 cols */}
          <div className="lg:col-span-7 space-y-12">
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="h-[1px] w-12 bg-[var(--benne-primary)]" />
                <span className="text-[var(--benne-primary)] font-black tracking-[0.4em] uppercase text-[10px]">
                  The Heart of the Bean
                </span>
              </div>
              <h1 className="font-[var(--font-playfair)] text-5xl md:text-7xl font-bold text-[var(--coffee)] leading-[1.1] tracking-tight">
                From Karnataka <br className="hidden md:block" />
                <span className="text-[var(--benne-primary)] italic">to Your Table.</span>
              </h1>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-8 text-[var(--coffee)]/70 leading-relaxed text-lg md:text-xl font-light max-w-2xl">
              <p>
                Our journey began with a simple craving—the craving for a <span className="font-bold text-[var(--coffee)] border-b-2 border-[var(--benne-primary)]/20">real Benne Dosa</span> in the heart of North India. Having grown up with the aroma of freshly ground coffee and the golden crunch of butter-ladled dosas, we realized something was missing in Lucknow.
              </p>
              <p>
                Benne n Beans was born out of a passion to bridge that gap. We didn't just want to serve food; we wanted to transport you to the bustling streets of Davangere and the misty plantations of Chikkamagaluru.
              </p>
            </motion.div>

          </div>
        </motion.div>

        {/* Redesigned Quote & Signature Section - Full Width */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative pt-24 pb-4"
        >
          <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-[0_30px_60px_-15px_rgba(58,36,28,0.08)] border border-[var(--coffee)]/5 relative overflow-hidden group">
            <Quote className="absolute -top-6 -left-6 w-32 h-32 text-[var(--benne-primary)]/5 -rotate-12 transition-transform group-hover:rotate-0 duration-700" />
            
            <div className="max-w-4xl">
              <p className="italic font-[var(--font-playfair)] text-3xl md:text-5xl text-[var(--coffee)] leading-tight relative z-10 mb-12">
                "We don't just use butter; we use memory. Every dosa is a piece of our home."
              </p>

              <div className="flex items-center gap-8 pt-10 border-t border-[var(--coffee)]/5">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 shadow-lg">
                  <Image 
                    src="/images/ownersimage.webp" 
                    alt="Pranav" 
                    fill 
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-[var(--font-playfair)] text-2xl md:text-3xl font-bold text-[var(--coffee)] mb-1">
                    Pranav & The Team
                  </p>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-[var(--benne-primary)]">
                    Founders of Benne n Beans
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
