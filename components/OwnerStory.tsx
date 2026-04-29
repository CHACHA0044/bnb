import Image from "next/image";

/**
 * OwnerStory — Masterpiece heritage layout.
 * Balanced grid, refined photo positioning, and high-end typography.
 */
export default function OwnerStory() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Photo Column - Refined Position */}
          <div className="relative group order-2 lg:order-1">
            <div className="relative z-20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[var(--coffee)]/30 border-[12px] border-white transform transition-transform duration-700 hover:rotate-1">
              <Image
                src="/images/ownersimage.webp"
                alt="The founders of Benne n Beans"
                width={800}
                height={1000}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
            
            {/* Classy Decorative Elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--benne-primary)]/10 rounded-full blur-2xl -z-10 animate-pulse" />
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[var(--butter-gold)]/20 rounded-full blur-3xl -z-10" />
            
            {/* The Heritage Badge */}
            <div className="absolute -bottom-8 -left-6 md:-left-12 z-30 bg-[var(--coffee)] p-8 md:p-10 rounded-[2rem] shadow-2xl border-4 border-white text-center">
              <p className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--benne-primary)]">10+</p>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 leading-none mt-2">
                Years of <br /> Heritage
              </p>
            </div>
          </div>

          {/* Text Column - High Contrast */}
          <div className="space-y-8 order-1 lg:order-2">
            <div>
              <span className="text-[var(--benne-primary)] font-black tracking-[0.4em] uppercase text-[10px] mb-4 block">
                The Heart of the Bean
              </span>
              <h1 className="font-[var(--font-playfair)] text-5xl md:text-7xl font-bold text-[var(--coffee)] leading-[1.1]">
                From Karnataka <br /> 
                <span className="text-[var(--benne-primary)] italic">to Your Table.</span>
              </h1>
            </div>

            <div className="space-y-6 text-[var(--coffee)]/80 leading-relaxed text-lg md:text-xl font-light">
              <p>
                Our journey began with a simple craving—the craving for a <span className="font-bold text-[var(--coffee)] border-b-2 border-[var(--benne-primary)]/30">real Benne Dosa</span> in the heart of North India. Having grown up with the aroma of freshly ground coffee and the golden crunch of butter-ladled dosas, we realized something was missing in Lucknow.
              </p>
              <p>
                Benne n Beans was born out of a passion to bridge that gap. We didn't just want to serve food; we wanted to transport you to the bustling streets of Davangere and the misty plantations of Chikkamagaluru.
              </p>
            </div>

            <div className="pt-6">
              <p className="italic font-[var(--font-playfair)] text-2xl md:text-3xl text-[var(--coffee)] border-l-8 border-[var(--benne-primary)] pl-8 py-4 leading-snug">
                "We don't just use butter; we use memory. Every dosa is a piece of our home."
              </p>
            </div>

            <div className="pt-10 flex items-center gap-6">
              <div className="w-16 h-1 bg-[var(--benne-primary)] rounded-full" />
              <p className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--coffee)]">
                Prana & The Team
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
