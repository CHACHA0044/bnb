"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Clock } from "lucide-react";
import { RESTAURANT_INFO } from "@/lib/constants";

/**
 * LocationSection — address, phone, hours, and map placeholder.
 * Consistent with the updated Premium Café colour palette.
 */
export default function LocationSection() {
  const { address, phone, hours } = RESTAURANT_INFO;

  return (
    <section
      id="location"
      className="section-padding bg-white"
      aria-labelledby="location-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14"
        >
          <span className="text-[var(--butter-gold)] font-semibold tracking-[0.18em] uppercase text-xs">
            Find Us
          </span>
          <h2
            id="location-heading"
            className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold text-[var(--coffee)] mt-3"
          >
            Our Location
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Info cards */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Address */}
            <div className="flex gap-5">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(231,111,81,0.10)" }}
              >
                <MapPin className="text-[var(--benne-primary)]" size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--coffee)] mb-1.5">
                  Address
                </h3>
                <p className="text-sm text-[var(--text)]/70 leading-relaxed">
                  {address.line1}
                  <br />
                  {address.line2}
                  <br />
                  {address.line3}
                  <br />
                  {address.city}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex gap-5">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(106,153,78,0.10)" }}
              >
                <Phone className="text-[var(--leaf)]" size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--coffee)] mb-1.5">
                  Call Us
                </h3>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="text-sm text-[var(--benne-primary)] hover:underline"
                >
                  {phone}
                </a>
              </div>
            </div>

            {/* Hours */}
            <div className="flex gap-5">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(244,162,97,0.10)" }}
              >
                <Clock className="text-[var(--butter-gold)]" size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--coffee)] mb-1.5">
                  Opening Hours
                </h3>
                <p className="text-sm text-[var(--text)]/70">
                  Mon – Fri: {hours.weekday}
                  <br />
                  Sat – Sun: {hours.weekend}
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-semibold text-sm transition-all duration-300 active:scale-95"
              style={{
                background: "var(--benne-primary)",
                boxShadow: "0 8px 24px rgba(231,111,81,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--rustic-orange)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--benne-primary)";
              }}
            >
              <Phone size={16} aria-hidden="true" />
              Call to Reserve
            </a>
          </motion.div>

          {/* Map placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.18, ease: "easeOut" }}
            className="relative rounded-3xl overflow-hidden h-[350px] md:h-[420px] flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--cream) 0%, #fde9d2 100%)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.10)",
            }}
          >
            <div className="text-center px-6">
              <MapPin
                className="mx-auto mb-4"
                style={{ color: "var(--benne-primary)" }}
                size={48}
              />
              <p
                className="font-[var(--font-playfair)] text-lg font-semibold mb-2"
                style={{ color: "var(--coffee)" }}
              >
                Map Coming Soon
              </p>
              <p className="text-sm" style={{ color: "var(--text)", opacity: 0.55 }}>
                {address.line1}, {address.line2}, {address.line3},{" "}
                {address.city}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
