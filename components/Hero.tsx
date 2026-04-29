import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

/**
 * Hero component optimized as a Server Component.
 * Removed framer-motion in favor of high-performance CSS animations.
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
          quality={85}
          className="object-cover opacity-40 scale-105 animate-slow-zoom"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[var(--coffee)]" />
      </div>

      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex flex-col justify-center items-start pt-20">
        <div className="animate-fade-in-up-hero">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--benne-primary)]/20 text-[var(--benne-primary)] text-sm font-bold tracking-wider uppercase mb-6 backdrop-blur-sm border border-[var(--benne-primary)]/30">
            Authentic Karnataka Flavours
          </span>
          
          <h1 className="font-[var(--font-playfair)] text-5xl md:text-8xl font-bold text-white leading-[1.1] mb-6 max-w-4xl">
            Where Tradition <br />
            <span className="text-[var(--benne-primary)]">Meets the Bean.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 max-w-xl mb-10 leading-relaxed font-light">
            Bringing the soul of Karnataka to Lucknow. Experience the crunch of Benne Dosa and the warmth of real Filter Coffee.
          </p>

          <div className="flex flex-col sm:flex-row gap-5">
            <Link 
              href="/menu"
              className="group flex items-center justify-center gap-3 bg-[var(--benne-primary)] text-white px-8 py-4 rounded-full text-lg font-bold shadow-2xl shadow-[var(--benne-primary)]/30 hover:bg-[var(--benne-primary)]/90 transition-all hover:translate-y-[-2px]"
            >
              Order Online
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link 
              href="/location"
              className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/20 transition-all"
            >
              <MapPin className="w-5 h-5 text-[var(--benne-primary)]" />
              Visit Us
            </Link>
          </div>
        </div>

        {/* Scroll Indicator - Optimized CSS */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
