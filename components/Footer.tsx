"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Instagram, Facebook, MapPin, Phone, Clock, Mail } from "lucide-react";

/**
 * Footer refactored as a Client Component to hide current page links.
 * Optimized layout for mobile and clean premium aesthetic.
 */
export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--coffee)] text-white/90">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--benne-primary)] rounded-full flex items-center justify-center">
                <Coffee className="text-white" size={24} />
              </div>
              <span className="font-[var(--font-playfair)] text-2xl font-bold tracking-tight">
                Benne <span className="text-[var(--benne-primary)]">n</span> Beans
              </span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Bringing the authentic Davangere Benne Dosa and traditional Filter Coffee experience to the heart of Lucknow.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.instagram.com/bennenbeans?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[var(--benne-primary)] hover:border-transparent transition-all"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="https://www.facebook.com/people/Benne-N-Beans/61584002647606/" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[var(--benne-primary)] hover:border-transparent transition-all"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="http://zoma.to/r/22526240" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#CB202D] hover:border-transparent transition-all group"
                title="Order on Zomato"
              >
                <div className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                    <path d="m5 11 4-7" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" /><path d="m9 11 1 9" /><path d="m15 11-1 9" />
                  </svg>
                </div>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-8 tracking-wider uppercase text-xs text-[var(--benne-primary)]">Quick Links</h4>
            <ul className="space-y-4">
              {["Home", "Menu", "Reviews", "Our Story", "Gallery", "Location"].filter(item => {
                const href = item === "Home" ? "/" : `/${item.toLowerCase().replace(" ", "-")}`;
                return pathname !== href;
              }).map((item) => (
                <li key={item}>
                  <Link 
                    href={item === "Home" ? "/" : `/${item.toLowerCase().replace(" ", "-")}`}
                    className="text-white/70 hover:text-[var(--benne-primary)] transition-colors text-sm"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold mb-8 tracking-wider uppercase text-xs text-[var(--benne-primary)]">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <MapPin className="text-[var(--benne-primary)] shrink-0" size={18} />
                <span>Sector K, Ashiyana, Lucknow, Uttar Pradesh 226012</span>
              </li>
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Phone className="text-[var(--benne-primary)] shrink-0" size={18} />
                <a href="tel:+919140391147" className="hover:text-[var(--benne-primary)] transition-colors">Call Us</a>
              </li>
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Mail className="text-[var(--benne-primary)] shrink-0" size={18} />
                <a href="mailto:pdembla@student.iul.ac.in" className="hover:text-[var(--benne-primary)] transition-colors">Email Us</a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-bold mb-8 tracking-wider uppercase text-xs text-[var(--benne-primary)]">Opening Hours</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <Clock className="text-[var(--benne-primary)] shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-white">Tue — Sun</p>
                  <p className="text-white/50">4:00 PM — 10:00 PM</p>
                  <p className="text-[var(--benne-primary)] text-[10px] font-bold uppercase mt-1">Monday: Closed</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/40 text-xs">
            © {currentYear} Benne n Beans. All rights reserved.
          </p>
          <div className="flex gap-8 text-white/40 text-xs">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
