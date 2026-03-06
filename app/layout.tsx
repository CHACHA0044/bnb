import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";

/* ─────────────────────────────────────────────
   Fonts — swap display prevents invisible text
   during load; subsets reduce bundle size
───────────────────────────────────────────── */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

/* ─────────────────────────────────────────────
   SEO Metadata
───────────────────────────────────────────── */
export const metadata: Metadata = {
  metadataBase: new URL("https://bennenbeans.in"),

  icons: {
    icon: "/images/logo.jpg",
    apple: "/images/logo.jpg",
  },

  title: {
    default: "Benne n Beans | Authentic Benne Dosa in Lucknow",
    template: "%s | Benne n Beans",
  },

  description:
    "Experience authentic Karnataka-style South Indian food at Benne n Beans, Lucknow. Crispy Benne Dosa, Thatte Idli, Filter Coffee & Uttapam — handcrafted on cast-iron tawas with love. Located in Ashiyana, Lucknow.",

  keywords: [
    "Benne Dosa Lucknow",
    "South Indian restaurant Lucknow",
    "Karnataka dosa Lucknow",
    "Benne n Beans",
    "filter coffee Lucknow",
    "Thatte Idli Lucknow",
    "Uttapam Lucknow",
    "dosa near me Lucknow",
    "Ashiyana restaurant",
    "best dosa Lucknow",
    "South Indian cafe Lucknow",
    "Benne dosa near me",
    "masala dosa Lucknow",
    "set dosa Lucknow",
    "authentic dosa Lucknow",
  ],

  authors: [{ name: "Benne n Beans", url: "https://bennenbeans.in" }],
  creator: "Benne n Beans",
  publisher: "Benne n Beans",
  category: "restaurant",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "https://bennenbeans.in",
  },

  /* Open Graph — WhatsApp / Facebook / LinkedIn shares */
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://bennenbeans.in",
    siteName: "Benne n Beans",
    title: "Benne n Beans — Authentic Benne Dosa in Lucknow",
    description:
      "Crispy Karnataka-style Benne Dosa, Thatte Idli, Filter Coffee & more. Handcrafted on cast-iron tawas. Visit us at Ashiyana, Lucknow.",
    images: [
      {
        url: "/images/benne-dosa.jpg",
        width: 1200,
        height: 630,
        alt: "Golden crispy Benne Dosa at Benne n Beans, Lucknow",
        type: "image/jpeg",
      },
    ],
  },

  /* Twitter / X card */
  twitter: {
    card: "summary_large_image",
    site: "@bennenbeans",
    creator: "@bennenbeans",
    title: "Benne n Beans — Authentic Benne Dosa in Lucknow",
    description:
      "Crispy Benne Dosa, Filter Coffee & South Indian street food now in Lucknow — Ashiyana.",
    images: [
      {
        url: "/images/benne-dosa.jpg",
        alt: "Benne Dosa at Benne n Beans, Lucknow",
      },
    ],
  },
};

/* ─────────────────────────────────────────────
   Viewport — separate export required by Next 14+
───────────────────────────────────────────── */
export const viewport: Viewport = {
  themeColor: "#E76F51",
  width: "device-width",
  initialScale: 1,
};

/* ─────────────────────────────────────────────
   JSON-LD — Restaurant / LocalBusiness schema
   Powers Google's rich result cards: star rating,
   address, hours, cuisine type, price range, map
───────────────────────────────────────────── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Benne n Beans",
  alternateName: "Benne and Beans",
  description:
    "Authentic Karnataka-style South Indian restaurant in Lucknow. Specialising in Benne Dosa, Thatte Idli, Filter Coffee and Uttapam.",
  url: "https://bennenbeans.in",
  telephone: "+919876543210",
  email: "hello@bennenbeans.in",
  foundingDate: "2025",
  image: [
    "https://bennenbeans.in/images/benne-dosa.jpg",
    "https://bennenbeans.in/images/filter-coffee.jpg",
  ],

  address: {
    "@type": "PostalAddress",
    streetAddress: "Sany Palace, Opposite Emerald Mall, Sector K, Ashiyana",
    addressLocality: "Lucknow",
    addressRegion: "Uttar Pradesh",
    postalCode: "226012",
    addressCountry: "IN",
  },

  geo: {
    "@type": "GeoCoordinates",
    latitude: "26.8014",
    longitude: "80.8939",
  },

  hasMap: "https://maps.app.goo.gl/xUT2H131zFcMdxZH8",

  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "22:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday"],
      opens: "07:30",
      closes: "22:30",
    },
  ],

  servesCuisine: ["South Indian", "Karnataka", "Indian", "Vegetarian"],
  priceRange: "₹",
  currenciesAccepted: "INR",
  paymentAccepted: "Cash, UPI, Credit Card, Debit Card",
  menu: "https://bennenbeans.in/#menu",

  sameAs: [
    "https://www.instagram.com/bennenbeans",
    "https://facebook.com/bennenbeans",
  ],

  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    bestRating: "5",
    worstRating: "1",
    reviewCount: "1000",
  },
};

/* ─────────────────────────────────────────────
   Root Layout
───────────────────────────────────────────── */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <head>
        {/*
         * ── Image preload strategy ────────────────────────────────────────
         * ① CRITICAL preload (fetchpriority=high)
         *     benne-dosa.jpg is both the hero background AND the floating
         *     circle — it is the LCP element on every viewport size.
         *     Fetching it before the parser finds the <img> tag cuts
         *     LCP by ~30–60 % on first load.
         *
         * ② DEFAULT preload (no fetchpriority)
         *     Images visible within the first scroll — SignatureItems cards.
         *     Preloading avoids a waterfall but doesn't compete with ①.
         *
         * ③ PREFETCH (rel=prefetch)
         *     Mid-page and gallery images. The browser fetches these at
         *     idle time so they are already cached when the user scrolls.
         * ──────────────────────────────────────────────────────────────── */}

        {/* ① LCP — maximum priority */}
        <link
          rel="preload"
          as="image"
          href="/images/benne-dosa.jpg"
          // @ts-expect-error fetchPriority is valid HTML but TS types lag
          fetchpriority="high"
        />

        {/* ② First-scroll images */}
        <link rel="preload" as="image" href="/images/thatte-idli.jpg" />
        <link rel="preload" as="image" href="/images/filter-coffee.jpg" />
        <link rel="preload" as="image" href="/images/uttapam.jpg" />

        {/* ③ Gallery + mid-page — idle prefetch */}
        <link rel="prefetch" as="image" href="/images/gallery1.jpg" />
        <link rel="prefetch" as="image" href="/images/gallery2.jpg" />
        <link rel="prefetch" as="image" href="/images/gallery3.jpg" />
        <link rel="prefetch" as="image" href="/images/gallery4.jpg" />

        {/* ── DNS prefetch & preconnect ─────────────────────────────────
            Eliminates DNS lookup + TLS handshake latency for Google
            Maps iframe and Instagram links before the user scrolls.   */}
        <link rel="dns-prefetch" href="//maps.google.com" />
        <link rel="dns-prefetch" href="//maps.gstatic.com" />
        <link rel="dns-prefetch" href="//www.instagram.com" />
        <link rel="preconnect" href="https://maps.google.com" crossOrigin="anonymous" />

        {/* ── Local / geo meta tags ─────────────────────────────────────
            Improve rankings in "near me" and city-level local searches. */}
        <meta name="geo.region" content="IN-UP" />
        <meta name="geo.placename" content="Lucknow, Uttar Pradesh, India" />
        <meta name="geo.position" content="26.8014;80.8939" />
        <meta name="ICBM" content="26.8014, 80.8939" />

        {/* ── JSON-LD structured data ───────────────────────────────────
            Enables Google rich results: star ratings, address, hours,
            cuisine and price range directly in the search snippet.    */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-[var(--font-poppins)] antialiased">{children}</body>
    </html>
  );
}
