"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
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
              Privacy <span className="text-[var(--benne-primary)] italic">Policy</span>
            </h1>
            
            <div className="space-y-8 text-[var(--coffee)]/80 leading-relaxed font-light">
              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">Introduction</h2>
                <p>
                  At Benne n' Beans, we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">Information We Collect</h2>
                <p>
                  We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                </p>
                <ul className="list-disc ml-6 mt-4 space-y-2">
                  <li><strong>Identity Data:</strong> includes first name, last name.</li>
                  <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
                  <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                  <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">How We Use Your Data</h2>
                <p>
                  We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                </p>
                <ul className="list-disc ml-6 mt-4 space-y-2">
                  <li>To process and deliver your order.</li>
                  <li>To manage our relationship with you.</li>
                  <li>To improve our website, products, and services.</li>
                  <li>To send you updates or marketing communications where you have consented.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">Data Security</h2>
                <p>
                  We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[var(--coffee)] mb-4">Contact Us</h2>
                <p>
                  If you have any questions about this privacy policy or our privacy practices, please contact us at:
                  <br />
                  <strong>Email:</strong> pdembla@student.iul.ac.in
                  <br />
                  <strong>Phone:</strong> +91 9140391147
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
