import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MenuGrid from "@/components/MenuGrid";
import ScrollIndicator from "@/components/ScrollIndicator";
import { Coffee, ArrowDown } from "lucide-react";

/**
 * The Dedicated Menu Page.
 * Designed for a premium, focused ordering experience.
 */
export default function MenuPage() {
  return (
    <div className="min-h-screen bg-[var(--cream)]/10">
      <Navbar />

      {/* Menu Header Section */}
      <section className="relative pt-32 pb-20 bg-[var(--coffee)] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/images/pattern-bg.webp')] bg-repeat opacity-40 mix-blend-soft-light" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-[var(--coffee)]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="w-16 h-16 bg-[var(--benne-primary)] rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-xl shadow-[var(--benne-primary)]/20">
            <Coffee size={32} className="text-white" />
          </div>

          <h1 className="font-[var(--font-playfair)] text-5xl md:text-7xl font-bold text-white mb-6">
            Our <span className="text-[var(--benne-primary)] italic">Full Menu</span>
          </h1>

          <p className="text-white/60 max-w-2xl mx-auto text-lg leading-relaxed font-light">
            Bringing the soul of Karnataka to your plate. Every dish is a legacy of flavour, crafted with pure butter and tradition.
          </p>

          <div className="mt-12 flex justify-center animate-bounce opacity-40">
            <ArrowDown className="text-[var(--benne-primary)]" />
          </div>
        </div>
      </section>

      {/* The Menu Grid (The Interactive Part) */}
      <main id="menu-start">
        <MenuGrid />
      </main>

      <Footer />
    </div>
  );
}
