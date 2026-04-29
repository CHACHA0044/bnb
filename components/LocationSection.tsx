import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";

/**
 * LocationSection refactored as a Server Component.
 * Cleaner UI: reduced excessive shadows and gradients.
 */
export default function LocationSection() {
  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--coffee)] mb-4">
            Visit <span className="text-[var(--benne-primary)]">Our Café</span>
          </h2>
          <p className="text-[var(--coffee)]/60 max-w-lg mx-auto">
            Experience the taste of Karnataka in Ashiyana, Lucknow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info Side */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-3xl bg-[var(--cream)]/30 border border-[var(--cream)] hover:bg-[var(--cream)]/50 transition-colors">
                <MapPin className="text-[var(--benne-primary)] mb-6" size={28} />
                <h4 className="font-bold text-[var(--coffee)] mb-2">Our Address</h4>
                <p className="text-[var(--coffee)]/60 text-sm leading-relaxed">
                  Sector K, Ashiyana, <br />
                  Lucknow, UP 226012
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[var(--cream)]/30 border border-[var(--cream)] hover:bg-[var(--cream)]/50 transition-colors">
                <Clock className="text-[var(--benne-primary)] mb-6" size={28} />
                <h4 className="font-bold text-[var(--coffee)] mb-2">Timing</h4>
                <p className="text-[var(--coffee)]/60 text-sm leading-relaxed">
                  Mon — Sun <br />
                  8:00 AM — 10:30 PM
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-[var(--coffee)] text-white relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-[var(--font-playfair)] text-2xl font-bold mb-6">Contact Details</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-white/80">
                    <Phone size={18} className="text-[var(--benne-primary)]" />
                    <span>+91 9123456789</span>
                  </div>
                  <div className="flex items-center gap-4 text-white/80">
                    <Mail size={18} className="text-[var(--benne-primary)]" />
                    <span>hello@bennenbeans.com</span>
                  </div>
                </div>
                <a 
                  href="https://maps.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 bg-[var(--benne-primary)] text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-all text-sm"
                >
                  Get Directions <ExternalLink size={16} />
                </a>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--benne-primary)]/10 rounded-full blur-3xl" />
            </div>
          </div>

          {/* Map Side - Use a cleaner static placeholder or lightweight embed */}
          <div className="h-[400px] lg:h-auto rounded-3xl overflow-hidden shadow-lg border-4 border-white">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3561.821734947936!2d80.9163013!3d26.7820641!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399bfb0000000000%3A0x0!2zMjbCsDQ2JzU1LjQiTiA4MMKwNTQnNTguNyJF!5e0!3m2!1sen!2sin!4v1714392000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Benne n Beans Location"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
