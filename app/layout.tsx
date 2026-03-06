import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";

/* ---- Google Fonts with Next.js optimization ---- */
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

/* ---- SEO Metadata ---- */
export const metadata: Metadata = {
  title: "Benne n Beans | Authentic Benne Dosa in Lucknow",
  description:
    "Experience authentic South Indian flavours at Benne n Beans, Lucknow. Crispy Benne Dosa, Thatte Idli, Filter Coffee & more — crafted with tradition, served with love.",
  keywords: [
    "Benne Dosa",
    "South Indian restaurant Lucknow",
    "Filter Coffee",
    "Thatte Idli",
    "Benne n Beans",
    "Uttapam",
    "Dosa near me",
  ],
  openGraph: {
    title: "Benne n Beans | Authentic Benne Dosa in Lucknow",
    description:
      "Crispy Benne Dosa, Thatte Idli, Filter Coffee & more — authentic South Indian street food in Lucknow.",
    url: "https://bennenbeans.in",
    siteName: "Benne n Beans",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/images/benne-dosa.jpg",
        width: 1200,
        height: 630,
        alt: "Benne n Beans — Authentic Benne Dosa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Benne n Beans | Authentic Benne Dosa in Lucknow",
    description:
      "Crispy Benne Dosa, Filter Coffee & more — South Indian flavours in Lucknow.",
    images: ["/images/benne-dosa.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <body className="font-[var(--font-poppins)] antialiased">
        {children}
      </body>
    </html>
  );
}
