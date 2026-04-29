import Image from "next/image";

const GALLERY_IMAGES = [
  { src: "/images/benne-dosa.webp", alt: "Benne Dosa close-up", size: "col-span-2 row-span-2" },
  { src: "/images/filter-coffee.webp", alt: "Filter Coffee preparation", size: "col-span-1 row-span-1" },
  { src: "/images/gallery1.webp", alt: "Café interiors", size: "col-span-1 row-span-1" },
  { src: "/images/thatte-idli.webp", alt: "Freshly made Idli", size: "col-span-1 row-span-2" },
  { src: "/images/gallery2.webp", alt: "Vada with chutney", size: "col-span-1 row-span-1" },
  { src: "/images/gallery3.webp", alt: "Happy customers", size: "col-span-1 row-span-1" },
];

/**
 * Gallery refactored as a Server Component.
 * Using existing .webp images.
 */
export default function Gallery() {
  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--coffee)] mb-4">
            A Glimpse into <span className="text-[var(--benne-primary)]">Our World</span>
          </h2>
          <p className="text-[var(--coffee)]/60 max-w-lg mx-auto">
            Visual stories of flavour, heritage, and the perfect crunch.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-3 gap-4 md:gap-6 h-[800px] md:h-[900px]">
          {GALLERY_IMAGES.map((img, idx) => (
            <div 
              key={idx} 
              className={`relative rounded-3xl overflow-hidden group border-4 border-white shadow-sm hover:shadow-xl transition-all duration-500 ${img.size}`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--coffee)]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-6 left-6 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <p className="font-[var(--font-playfair)] text-lg font-bold">{img.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
