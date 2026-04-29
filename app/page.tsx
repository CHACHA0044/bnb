import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SignatureItems from "@/components/SignatureItems";
import Footer from "@/components/Footer";
import ScrollIndicator from "@/components/ScrollIndicator";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Clean Homepage — Strictly NO menu list.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <Hero />
        <SignatureItems />

        {/* Dedicated Menu CTA Section */}
        <section className="py-24 bg-[var(--coffee)] relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[url('/images/pattern-bg.png')] opacity-5" />
          <div className="relative z-10 max-w-3xl mx-auto px-6">
            <h2 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-bold text-white mb-8">
              Explore Our <br />
              <span className="text-[var(--benne-primary)] italic">Full Collection</span>
            </h2>
            <p className="text-white/60 text-lg mb-12 font-light leading-relaxed">
              From our signature Benne Dosas to our authentic Filter Coffee, discover the complete taste of Karnataka.
            </p>
            <Link 
              href="/menu" 
              className="inline-flex items-center gap-4 bg-[var(--benne-primary)] text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl shadow-[var(--benne-primary)]/40 hover:scale-105 transition-all"
            >
              View Dedicated Menu Page <ArrowRight />
            </Link>
          </div>
        </section>

        {/* Story CTA */}
        <section className="py-20 bg-white text-center">
          <div className="max-w-xl mx-auto px-6">
            <h3 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--coffee)] mb-4">Our Heritage</h3>
            <p className="text-[var(--coffee)]/60 mb-8 font-light">Born in Karnataka, serving in Lucknow. Discover the story behind every bite.</p>
            <Link href="/story" className="text-[var(--benne-primary)] font-bold hover:underline">Read Our Story →</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
