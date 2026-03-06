"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";

/**
 * Navbar — sticky top navigation with glass-blur effect on scroll.
 * Transparent at the top; frosted-cream on scroll.
 * Mobile: animated hamburger → staggered slide-down link list.
 * Fixed: Smooth scroll navigation that works reliably on mobile.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Handle link click with smooth scroll for mobile
  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();

    // Close mobile menu first
    setMobileOpen(false);

    // Get the target element
    const targetId = href.replace('#', '');
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      // Small delay to allow menu to close, then scroll
      setTimeout(() => {
        const navbarHeight = 80; // Account for fixed navbar
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, []);

  // Handle desktop link click
  const handleDesktopLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();

    const targetId = href.replace('#', '');
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const navbarHeight = 80;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={
        scrolled
          ? {
              background: "rgba(243,232,218,0.72)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }
          : undefined
      }
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out ${
        !scrolled ? "bg-transparent" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 py-4">
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => handleDesktopLinkClick(e, '#home')}
          className="font-[var(--font-playfair)] text-2xl md:text-3xl font-bold tracking-tight select-none"
          style={{ color: scrolled ? "var(--coffee)" : "white" }}
        >
          Benne{" "}
          <span style={{ color: "var(--benne-primary)" }}>n</span>
          {" "}Beans
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => handleDesktopLinkClick(e, link.href)}
                className="relative text-sm font-medium transition-colors duration-300
                  after:absolute after:bottom-[-4px] after:left-0 after:h-[2px]
                  after:w-0 after:rounded-full after:bg-[var(--benne-primary)]
                  after:transition-all after:duration-300 hover:after:w-full"
                style={{ color: scrolled ? "var(--coffee)" : "rgba(255,255,255,0.9)" }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile toggle */}
        <motion.button
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl
            transition-colors duration-200 active:scale-95"
          style={{ color: scrolled ? "var(--coffee)" : "white" }}
          onClick={() => setMobileOpen((prev) => !prev)}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={24} strokeWidth={2} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu size={24} strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden overflow-hidden border-t border-white/10"
            style={{
              background: "rgba(243,232,218,0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <ul
              className="flex flex-col items-center gap-1 py-5 px-4"
              role="list"
            >
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="w-full"
                >
                  <a
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link.href)}
                    className="flex items-center justify-center w-full py-3 text-base font-medium
                      rounded-xl transition-colors duration-200
                      text-[var(--coffee)] hover:text-[var(--benne-primary)]
                      hover:bg-[var(--benne-primary)]/8 active:bg-[var(--benne-primary)]/12"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
