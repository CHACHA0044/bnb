"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function TermsOfService() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream)] pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-bold text-[var(--coffee)] mb-8">
              Terms of <span className="text-[var(--benne-primary)] italic">Service</span>
            </h1>
            
            <div className="space-y-8 text-[var(--coffee)]/80 leading-relaxed font-light">
              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">1. Agreement to Terms</h2>
                <p>
                  By accessing our website at Benne n' Beans, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">2. Use License</h2>
                <p>
                  Permission is granted to temporarily download one copy of the materials (information or software) on Benne n' Beans' website for personal, non-commercial transitory viewing only.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">3. Ordering & Payments</h2>
                <p>
                  When you place an order through our website or our partner platforms (like Zomato), you agree to provide accurate information. All payments are processed securely, and you agree to pay all charges incurred by your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">4. Disclaimer</h2>
                <p>
                  The materials on Benne n' Beans' website are provided on an 'as is' basis. Benne n' Beans makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">5. Limitations</h2>
                <p>
                  In no event shall Benne n' Beans or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Benne n' Beans' website.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">6. Governing Law</h2>
                <p>
                  These terms and conditions are governed by and construed in accordance with the laws of Uttar Pradesh, India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
