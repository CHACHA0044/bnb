import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SIGNATURE_ITEMS = [
  {
    name: "Plain Benne Dosa",
    price: "₹140",
    image: "/images/benne-dosa.webp",
    description: "The golden crunch of Davangere style butter dosa.",
  },
  {
    name: "Filter Coffee",
    price: "₹40",
    image: "/images/filter-coffee.webp",
    description: "Classic brass tumbler coffee, frothed to perfection.",
  },
  {
    name: "Thatte Idli",
    price: "₹70",
    image: "/images/thatte-idli.webp",
    description: "Soft, plate-sized idli served with butter and spicy podi.",
  },
];

/**
 * SignatureItems refactored as a Server Component.
 * Using real images from the public folder.
 */
export default function SignatureItems() {
  return (
    <section className="section-padding bg-[var(--cream)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div className="max-w-xl">
            <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--coffee)] mb-4">
              Our <span className="text-[var(--benne-primary)] italic">Signatures</span>
            </h2>
            <p className="text-[var(--coffee)]/70 text-lg">
              The dishes that define us. Crafted with authentic ingredients sourced directly from Karnataka.
            </p>
          </div>
          <Link 
            href="/menu" 
            className="hidden md:flex items-center gap-2 text-[var(--benne-primary)] font-bold border-b-2 border-transparent hover:border-[var(--benne-primary)] transition-all pb-1"
          >
            View Full Menu <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SIGNATURE_ITEMS.map((item, idx) => (
            <div 
              key={idx} 
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-[var(--coffee)]/5"
            >
              <div className="relative h-72 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  loading="lazy"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1 rounded-full font-bold text-[var(--coffee)] shadow-sm">
                  {item.price}
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--coffee)] mb-3">
                  {item.name}
                </h3>
                <p className="text-[var(--coffee)]/60 text-sm leading-relaxed mb-6">
                  {item.description}
                </p>
                <Link 
                  href="/menu"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[var(--benne-primary)] group/link"
                >
                  Order Now 
                  <span className="transition-transform group-hover/link:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
