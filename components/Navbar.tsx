"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Coffee, ChevronRight } from "lucide-react";

/**
 * Optimized Navbar — CSS transitions for scroll state instead of
 * per-frame Framer Motion springs. Only the mobile drawer uses motion.
 */
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Menu", href: "/menu" },
    { name: "Reviews", href: "/reviews" },
    { name: "Our Story", href: "/story" },
    { name: "Gallery", href: "/gallery" },
    { name: "Location", href: "/location" },
  ];

  const isDarkHeaderPage = pathname === "/menu" || pathname === "/gallery";
  const shouldBeWhite = !scrolled && (pathname === "/" || isDarkHeaderPage);
  const textColor = shouldBeWhite ? "#FFFFFF" : "#3A241C";

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Navbar — CSS transitions only, no Framer Motion on scroll */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out transform-gpu ${scrolled
            ? "py-3 bg-white/85 backdrop-blur-2xl shadow-[0_20px_50px_rgba(58,36,28,0.12)] rounded-b-[3rem] border-b border-[var(--benne-primary)]/10"
            : "py-6 bg-transparent border-b border-transparent"
          }`}
        style={{
          WebkitBackdropFilter: scrolled ? "blur(40px) saturate(180%)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className={`w-10 h-10 bg-[var(--benne-primary)] rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-12 shadow-lg shadow-[var(--benne-primary)]/20 ${scrolled ? "scale-90" : "scale-100"
                }`}
            >
              <Coffee className="text-white" size={20} />
            </div>
            <span
              className="font-[var(--font-playfair)] text-xl font-bold tracking-tight transition-colors duration-300"
              style={{ color: textColor }}
            >
              Benne <span className="text-[var(--benne-primary)]">n</span> Beans
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="relative text-[11px] font-black tracking-[0.25em] uppercase group/link"
              >
                <span
                  className="transition-colors duration-300"
                  style={{ color: isActive(link.href) ? "#E76F51" : textColor }}
                >
                  {link.name}
                </span>
                <span
                  className={`absolute -bottom-2 left-0 h-[3px] bg-[var(--benne-primary)] rounded-full transition-all duration-300 ${isActive(link.href) ? "w-full" : "w-0 group-hover/link:w-full"
                    }`}
                />
              </Link>
            ))}
            <a
              href="https://www.zomato.com/lucknow/benne-n-beans-3-aashiana/order"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--benne-primary)] text-white px-8 py-3 rounded-full text-[11px] font-black shadow-2xl shadow-[var(--benne-primary)]/40 hover:scale-105 active:scale-95 transition-all duration-200 uppercase tracking-[0.2em]"
            >
              Order Now
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden w-12 h-12 flex items-center justify-center transition-all duration-300 active:scale-90"
            style={{
              backgroundColor: "transparent",
              color: textColor,
            }}
            onClick={() => setIsOpen(true)}
            aria-label="Open Menu"
          >
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* Premium Mobile Drawer — keeps Framer Motion (user-initiated, infrequent) */}
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
                    className={`flex items-center justify-between group p-5 rounded-2xl transition-all duration-200 ${isActive(link.href) ? "bg-white text-[var(--benne-primary)] shadow-sm" : "text-[var(--coffee)] hover:bg-white/50"
                      }`}
                  >
                    <span className="text-xl font-bold tracking-tight">{link.name}</span>
                    <ChevronRight size={18} className="opacity-40" />
                  </Link>
                ))}
              </nav>

              <div className="mt-auto">
                <a
                  href="https://www.zomato.com/lucknow/benne-n-beans-3-aashiana/order"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center bg-[var(--benne-primary)] text-white py-5 rounded-2xl text-lg font-black shadow-2xl shadow-[var(--benne-primary)]/30 uppercase tracking-widest"
                >
                  Order Now
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
