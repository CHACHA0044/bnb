import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StaticMenu from "@/components/StaticMenu";
import ScrollIndicator from "@/components/ScrollIndicator";
import { Coffee } from "lucide-react";

export const metadata = {
  title: "Menu | Benne n Beans",
  description: "Explore the full menu of Benne n Beans — authentic Karnataka-style Benne Dosas, Idlis, Uttapam, and Filter Coffee in Lucknow.",
};

/**
 * The Dedicated Menu Page — premium static menu display.
 * No API calls. Light coffee-brown background.
 */
export default function MenuPage() {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      {/* Menu Header Section */}
      <section className="relative pt-32 pb-20 bg-[var(--coffee)] overflow-hidden">
        <div className="absolute inset-0 css-pattern" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)] via-transparent to-[var(--coffee)]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="w-16 h-16 bg-[var(--benne-primary)] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-[var(--benne-primary)]/20">
            <Coffee size={32} className="text-white" />
          </div>

          <h1 className="font-[var(--font-playfair)] text-5xl md:text-7xl font-bold text-white mb-6">
            Our <span className="text-[var(--benne-primary)] italic">Menu</span>
          </h1>

          <p className="text-white/60 max-w-2xl mx-auto text-lg leading-relaxed font-light">
            Bringing the soul of Karnataka to your plate. Every dish is a legacy of flavour, crafted with pure butter and tradition.
          </p>
        </div>
      </section>

      {/* The Static Menu */}
      <main>
        <StaticMenu />
      </main>

      <Footer />
    </div>
  );
}
