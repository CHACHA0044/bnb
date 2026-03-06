"use client";

import { Instagram, Facebook, Twitter, MapPin, Phone } from "lucide-react";
import { RESTAURANT_INFO, NAV_LINKS } from "@/lib/constants";

/**
 * Footer — brand name, quick links, social icons, phone,
 * location, and copyright notice.
 * Uses the updated Premium Café colour palette.
 */
export default function Footer() {
  const { name, phone, address, socials } = RESTAURANT_INFO;
  const year = new Date().getFullYear();

  return (
    <footer
      className="text-white"
      style={{
        background:
          "linear-gradient(160deg, var(--coffee) 0%, #1e0d08 100%)",
      }}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand */}
        <div>
          <h2 className="font-[var(--font-playfair)] text-2xl font-bold mb-3">
            Benne{" "}
            <span style={{ color: "var(--benne-primary)" }}>n</span>
            {" "}Beans
          </h2>
          <p className="text-white/55 text-sm leading-relaxed max-w-xs">
            Authentic South Indian flavours in Lucknow — crispy Benne Dosa,
            frothy filter coffee &amp; more.
          </p>

          {/* Subtle divider accent */}
          <div
            className="mt-6 h-0.5 w-12 rounded-full"
            style={{ background: "var(--benne-primary)" }}
          />
        </div>

        {/* Quick Links */}
        <div>
          <h3
            className="font-semibold text-xs uppercase tracking-[0.18em] mb-5"
            style={{ color: "var(--butter-gold)" }}
          >
            Quick Links
          </h3>
          <ul className="space-y-2.5" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-white/65 text-sm transition-colors duration-200 hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact & Social */}
        <div>
          <h3
            className="font-semibold text-xs uppercase tracking-[0.18em] mb-5"
            style={{ color: "var(--butter-gold)" }}
          >
            Contact
          </h3>
          <div className="space-y-3 text-sm text-white/65">
            <div className="flex items-start gap-2.5">
              <MapPin
                size={15}
                className="mt-0.5 flex-shrink-0"
                style={{ color: "var(--benne-primary)" }}
              />
              <span>
                {address.line1}, {address.line2}, {address.line3},{" "}
                {address.city}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone
                size={15}
                className="flex-shrink-0"
                style={{ color: "var(--benne-primary)" }}
              />
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="hover:text-white transition-colors duration-200"
              >
                {phone}
              </a>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3 mt-7">
            {[
              { href: socials.instagram, Icon: Instagram, label: "Follow us on Instagram" },
              { href: socials.facebook, Icon: Facebook, label: "Follow us on Facebook" },
              { href: socials.twitter, Icon: Twitter, label: "Follow us on Twitter" },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 transition-all duration-300 hover:text-white hover:scale-110"
                style={{ background: "rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--benne-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.08)";
                }}
              >
                <Icon size={17} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40 px-6">
        © {year}{" "}
        <span className="text-white/55">{name}</span>
        . All rights reserved.
      </div>
    </footer>
  );
}
