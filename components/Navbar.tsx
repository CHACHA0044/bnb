"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Coffee, ChevronRight } from "lucide-react";

/**
 * Intelligent Navbar with Spring Physics.
 * Automatically adapts colors based on page header themes (Light vs Dark).
 */
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Menu", href: "/menu" },
    { name: "Our Story", href: "/story" },
    { name: "Gallery", href: "/gallery" },
    { name: "Location", href: "/location" },
  ];

  // Logic: Menu page has a dark header initially. Story & Home (top) vary.
  const isDarkHeaderPage = pathname === "/menu";
  const shouldBeWhite = !scrolled && (pathname === "/" || isDarkHeaderPage);
  const textColor = shouldBeWhite ? "#FFFFFF" : "#3A241C";

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <motion.nav 
        initial={false}
        animate={{
          backgroundColor: scrolled ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0)",
          paddingTop: scrolled ? "0.75rem" : "1.5rem",
          paddingBottom: scrolled ? "0.75rem" : "1.5rem",
          borderBottomLeftRadius: scrolled ? "2.5rem" : "0rem",
          borderBottomRightRadius: scrolled ? "2.5rem" : "0rem",
          boxShadow: scrolled ? "0 20px 50px rgba(58, 36, 28, 0.15)" : "0 0px 0px rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
        className="fixed top-0 left-0 right-0 z-[100] border-b border-transparent"
        style={{ 
          backdropFilter: scrolled ? "blur(32px) saturate(180%)" : "blur(0px)",
          WebkitBackdropFilter: scrolled ? "blur(32px) saturate(180%)" : "blur(0px)",
          borderBottomColor: scrolled ? "rgba(231, 111, 81, 0.15)" : "transparent"
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div 
              animate={{ scale: scrolled ? 0.9 : 1 }}
              className="w-10 h-10 bg-[var(--benne-primary)] rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12 shadow-lg shadow-[var(--benne-primary)]/20"
            >
              <Coffee className="text-white" size={20} />
            </motion.div>
            <motion.span 
              animate={{ color: textColor }}
              className="font-[var(--font-playfair)] text-xl font-bold tracking-tight transition-colors"
            >
              Benne <span className="text-[var(--benne-primary)]">n</span> Beans
            </motion.span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="relative text-[11px] font-black tracking-[0.25em] uppercase group/link"
              >
                <motion.span
                  animate={{ color: isActive(link.href) ? "#E76F51" : textColor }}
                  className="transition-colors"
                >
                  {link.name}
                </motion.span>
                <motion.span 
                  className="absolute -bottom-2 left-0 h-[3px] bg-[var(--benne-primary)] rounded-full"
                  initial={false}
                  animate={{ width: isActive(link.href) ? "100%" : "0%" }}
                  whileHover={{ width: "100%" }}
                />
              </Link>
            ))}
            <Link 
              href="/menu" 
              className="bg-[var(--benne-primary)] text-white px-8 py-3 rounded-full text-[11px] font-black shadow-2xl shadow-[var(--benne-primary)]/40 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]"
            >
              Order Now
            </Link>
          </div>

          {/* Mobile Toggle */}
          <motion.button 
            animate={{ 
              backgroundColor: shouldBeWhite ? "rgba(255, 255, 255, 0.15)" : "rgba(58, 36, 28, 0.08)",
              color: textColor
            }}
            className="md:hidden w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
            onClick={() => setIsOpen(true)}
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </motion.button>
        </div>
      </motion.nav>

      {/* Premium Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110]">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--coffee)]/80 backdrop-blur-2xl"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 120, damping: 25 }}
              className="absolute top-0 right-0 w-full max-w-xs h-full bg-[var(--cream)] shadow-2xl flex flex-col p-10"
            >
              <div className="flex justify-between items-center mb-16">
                <div className="w-10 h-10 bg-[var(--benne-primary)] rounded-xl flex items-center justify-center">
                  <Coffee className="text-white" size={20} />
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[var(--coffee)] shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between group p-5 rounded-2xl transition-all ${
                      isActive(link.href) ? "bg-white text-[var(--benne-primary)] shadow-sm" : "text-[var(--coffee)] hover:bg-white/50"
                    }`}
                  >
                    <span className="text-xl font-bold tracking-tight">{link.name}</span>
                    <ChevronRight size={18} className="opacity-40" />
                  </Link>
                ))}
              </nav>

              <div className="mt-auto">
                <Link 
                  href="/menu" 
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center bg-[var(--benne-primary)] text-white py-5 rounded-2xl text-lg font-black shadow-2xl shadow-[var(--benne-primary)]/30 uppercase tracking-widest"
                >
                  Order Now
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
