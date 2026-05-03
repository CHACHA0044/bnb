import Link from "next/link";
import { Coffee, Instagram, Facebook, MapPin, Phone, Clock, Mail } from "lucide-react";

/**
 * Footer refactored as a Server Component.
 * Optimized layout for mobile and clean premium aesthetic.
 */
export default function Footer() {
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
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-8 tracking-wider uppercase text-xs text-[var(--benne-primary)]">Quick Links</h4>
            <ul className="space-y-4">
              {["Home", "Menu", "Our Story", "Gallery", "Location"].map((item) => (
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
                <a href="tel:+919140391147" className="hover:text-[var(--benne-primary)] transition-colors">+91 9140391147</a>
              </li>
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Mail className="text-[var(--benne-primary)] shrink-0" size={18} />
                <a href="mailto:pdembla@student.iul.ac.in" className="hover:text-[var(--benne-primary)] transition-colors break-all">pdembla@student.iul.ac.in</a>
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
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
