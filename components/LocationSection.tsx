"use client";

import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";
import { motion, Variants } from "framer-motion";

/**
 * LocationSection — Premium coffee-themed location and contact section.
 */
export default function LocationSection() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <section className="pt-24 pb-12 md:pb-24 bg-[var(--cream)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.h2 variants={itemVariants} className="font-[var(--font-playfair)] text-5xl md:text-6xl font-bold text-[var(--coffee)] mb-6 tracking-tight">
            Visit <span className="text-[var(--benne-primary)] italic">Our Café</span>
          </motion.h2>
          <motion.p variants={itemVariants} className="text-[var(--coffee)]/50 max-w-lg mx-auto text-lg font-light leading-relaxed">
            Experience the authentic taste of Karnataka in the heart of Ashiyana, Lucknow.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* Info Side */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="p-8 rounded-[2.5rem] bg-white border border-[var(--coffee)]/5 shadow-[0_20px_50px_-20px_rgba(58,36,28,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(58,36,28,0.1)] transition-all duration-500 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--benne-primary)]/10 flex items-center justify-center text-[var(--benne-primary)] mb-6 group-hover:scale-110 transition-transform duration-500">
                  <MapPin size={30} />
                </div>
                <h4 className="font-bold text-[var(--coffee)] text-xl mb-3 tracking-tight">Our Address</h4>
                <p className="text-[var(--coffee)]/60 text-sm leading-relaxed font-medium">
                  Sector K, Ashiyana, <br />
                  Lucknow, UP 226012
                </p>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="p-8 rounded-[2.5rem] bg-white border border-[var(--coffee)]/5 shadow-[0_20px_50px_-20px_rgba(58,36,28,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(58,36,28,0.1)] transition-all duration-500 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--benne-primary)]/10 flex items-center justify-center text-[var(--benne-primary)] mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Clock size={24} />
                </div>
                <h4 className="font-bold text-[var(--coffee)] text-xl mb-3 tracking-tight">Timing</h4>
                <div className="space-y-1">
                  <p className="text-[var(--benne-primary)] text-xs font-black uppercase tracking-widest">Tue — Sun</p>
                  <p className="text-[var(--coffee)] text-base font-bold italic">4:00 PM — 10:00 PM</p>
                  <p className="text-[var(--coffee)]/40 text-[10px] font-bold uppercase tracking-widest pt-1 border-t border-[var(--coffee)]/5 mt-2">Monday: Closed</p>
                </div>
              </motion.div>
            </div>

            <motion.div 
              variants={itemVariants}
              className="flex-1 p-10 rounded-[3rem] bg-[#3A241C] text-white relative overflow-hidden shadow-[0_40px_80px_-20px_rgba(58,36,28,0.3)] border border-white/5"
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-8">
                  <h4 className="font-[var(--font-playfair)] text-3xl font-bold mb-2">Get in Touch</h4>
                  <p className="text-white/40 text-sm font-medium tracking-wide uppercase tracking-[0.1em]">We'd love to hear from you</p>
                </div>
                
                <div className="space-y-6 mb-10">
                  <a 
                    href="tel:+919140391147" 
                    className="flex items-center gap-5 text-white/90 hover:text-[var(--benne-primary)] transition-colors group p-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[var(--benne-primary)]/20 transition-all">
                      <Phone size={18} className="text-[var(--benne-primary)]" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">+91 9140391147</span>
                  </a>
                  
                  <a 
                    href="mailto:pdembla@student.iul.ac.in" 
                    className="flex items-center gap-5 text-white/90 hover:text-[var(--benne-primary)] transition-colors group p-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[var(--benne-primary)]/20 transition-all">
                      <Mail size={18} className="text-[var(--benne-primary)]" />
                    </div>
                    <span className="text-lg font-bold tracking-tight break-all">pdembla@student.iul.ac.in</span>
                  </a>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5">
                  <a 
                    href="https://maps.app.goo.gl/Jxpw1iJPcsBgemcMA" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-3 bg-[var(--benne-primary)] text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-[var(--benne-primary)]/20"
                  >
                    Get Directions <ExternalLink size={16} />
                  </a>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[var(--benne-primary)]/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
            </motion.div>
          </motion.div>

          {/* Map Side */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="min-h-[500px] lg:h-full rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white relative group"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3561.61138408345!2d80.9095401297211!3d26.788654897202143!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399bfd6ea814fd43%3A0xa1ec4be90c8c7f07!2sBenne%20n&#39;%20Beans!5e0!3m2!1sen!2sin!4v1777789818199!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Benne n Beans Location"
              className="grayscale-[0.2] contrast-[1.1] brightness-[0.95] group-hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 pointer-events-none border-[12px] border-white/10 rounded-[2.8rem]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
