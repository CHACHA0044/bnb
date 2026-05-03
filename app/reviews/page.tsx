"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { motion } from "framer-motion";
import { Star, MessageSquare, Quote } from "lucide-react";

const REVIEWS_DATA = [
  {
    name: "Shubham Bajpai",
    rating: 5,
    text: "Ghee Podi Masala Benne Dosa 🔥 Golden crispy dosa 🥞✨ drenched in benne 🧈, desi ghee and spicy podi 🌶️🔥 — one bite and total food heaven 😍",
    date: "4 months ago",
    isLocalGuide: true,
  },
  {
    name: "Suyash Misra",
    rating: 5,
    text: "Taste of Ghee Podi Thatte Idli was really good first time tried it and Masala Benne Dosa was also good. Benne means Butter. Authentic Karnataka taste in Lucknow.",
    date: "2 months ago",
    isLocalGuide: true,
  },
  {
    name: "Rashmi Verma",
    rating: 5,
    text: "Crisp dosa, fresh chutneys, perfect sambar — hands down the best South Indian spot in town. Must Visit. Highly recommended!!!!!",
    date: "4 months ago",
    isLocalGuide: true,
  },
  {
    name: "Shagun Bhasin",
    rating: 5,
    text: "This place is amazing 💓 tried ghee podi idli, plain idli, ghee podi masala dosa, filter coffee. All things were super tasty. 6 out of 5 - that good.",
    date: "3 months ago",
    isLocalGuide: false,
  },
  {
    name: "Kushagra Tiwari",
    rating: 5,
    text: "The best dosa and filter coffee I've ever had in Lucknow...!!! Do try their benne masala dosa. It's out of this world. Very hygenically prepared.",
    date: "2 months ago",
    isLocalGuide: false,
  },
  {
    name: "Kumar Kartavya",
    rating: 5,
    text: "The Best Benne In Lucknow Incredible Thatte Idli And The Filter Coffee On Point A Must Go If You're Into South Indian Food",
    date: "2 months ago",
    isLocalGuide: false,
  },
  {
    name: "Pratyush Ranjan",
    rating: 5,
    text: "Delicious food! We ordered Masala Benne Dosa, Mysore Masala Dosa, Uttapam, Filter Coffee. Each item was flavourful. Chutneys served with the Dosa were very tasty.",
    date: "4 months ago",
    isLocalGuide: true,
  },
  {
    name: "Vidhi Shahdad Puri",
    rating: 5,
    text: "Tried their Ghee Podi Benne Masala dosa and thatte Idli, absolutely Yumm...😍🔥 Dosa super crispy, idli was melting in mouth and full of flavor. 🤤👌",
    date: "4 months ago",
    isLocalGuide: false,
  },
  {
    name: "Ankita Gaur",
    rating: 5,
    text: "Just had the most amazing Dosa at Benne n' Beans in Lucknow! The dosa was crispy and amazing in taste. The chutneys and sambhar were also top-notch.",
    date: "4 months ago",
    isLocalGuide: false,
  },
  {
    name: "kanika balani",
    rating: 5,
    text: "Benne dosa is a must try. Very crispy and tasty. I like it better than regular dosa. We tried garlic podi benne dosa and it was super tasty!!",
    date: "3 months ago",
    isLocalGuide: true,
  },
  {
    name: "Priyanshi Rastogi",
    rating: 5,
    text: "Just had an amazing South Indian experience at Benne N Beans in Lucknow! Their dosas are TO DIE FOR 🍴👌. The Mysore dosa was crispy and flavorful.",
    date: "4 months ago",
    isLocalGuide: false,
  },
  {
    name: "shivam sharma",
    rating: 5,
    text: "Absolutely loved the benne podi idli and filter Coffee here! Soft, buttery, and coated with the most flavorful podi I've ever tasted. Warm, authentic vibe.",
    date: "4 months ago",
    isLocalGuide: true,
  },
  {
    name: "Sho s",
    rating: 5,
    text: "Excellent food....!! Lovely people...All the best...must try thatte idli with ghee podi, benne Dosa...!!",
    date: "2 months ago",
    isLocalGuide: false,
  },
  {
    name: "Harsh Mehrotra",
    rating: 5,
    text: "Absolutely loved the benne dosa here! Perfectly crisp outside, soft inside, and generously buttered. Chutneys were fresh and flavourful.",
    date: "3 months ago",
    isLocalGuide: false,
  },
  {
    name: "Mohit Shahdad Puri",
    rating: 5,
    text: "Benne N Beans is a must-visit for South Indian dosa lovers! Every dosa on the menu is worth trying, but the Ghee Phodi Benne Dosa truly stands out.",
    date: "4 months ago",
    isLocalGuide: false,
  },
];

export default function ReviewsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream)] pt-32 pb-20 overflow-x-hidden">
        {/* Hero Section */}
        <section className="px-6 mb-20">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--benne-primary)]/10 text-[var(--benne-primary)] text-sm font-bold tracking-widest uppercase mb-8 border border-[var(--benne-primary)]/20">
                <Star size={14} className="fill-[var(--benne-primary)]" />
                Verified Customer Stories
              </div>
              
              <h1 className="font-[var(--font-playfair)] text-5xl md:text-8xl font-bold text-[var(--coffee)] mb-8 leading-tight">
                What Our <span className="text-[var(--benne-primary)] italic">Guests Say.</span>
              </h1>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                <div className="flex flex-col items-center">
                  <div className="text-6xl md:text-8xl font-black text-[var(--coffee)] mb-2">4.9</div>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={24} className="fill-[var(--benne-primary)] text-[var(--benne-primary)]" />
                    ))}
                  </div>
                  <div className="text-[var(--coffee)]/50 font-medium tracking-widest uppercase text-xs">Based on 120+ Reviews</div>
                </div>
                
                <div className="h-[1px] w-20 md:h-20 md:w-[1px] bg-[var(--coffee)]/10" />
                
                <div className="max-w-md text-left hidden md:block">
                  <Quote className="text-[var(--benne-primary)] mb-4" size={40} />
                  <p className="text-[var(--coffee)]/60 text-lg leading-relaxed font-light italic">
                    "Every review is a story of tradition, butter, and authentic flavors brought from the heart of Karnataka to Lucknow."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Reviews Grid */}
        <section className="px-6 relative">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-5">
            <div className="absolute top-1/4 left-10 text-[200px] font-black text-[var(--coffee)] select-none">BNB</div>
            <div className="absolute bottom-1/4 right-10 text-[200px] font-black text-[var(--coffee)] select-none rotate-180">BNB</div>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {REVIEWS_DATA.map((review, idx) => (
                <div key={idx} className="flex h-full">
                  <ReviewCard 
                    name={review.name}
                    rating={review.rating}
                    text={review.text}
                    date={review.date}
                    isLocalGuide={review.isLocalGuide}
                    index={idx}
                  />
                </div>
              ))}
            </div>
            
            {/* CTA Section */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-24 text-center p-12 md:p-20 rounded-[3rem] bg-[var(--coffee)] text-white relative overflow-hidden group shadow-2xl"
            >
              <div className="absolute inset-0 glassy-pattern opacity-10" />
              <div className="relative z-10">
                <MessageSquare className="mx-auto text-[var(--benne-primary)] mb-8" size={60} />
                <h2 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-bold mb-6">Experience it Yourself.</h2>
                <p className="text-white/60 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light">
                  Join the hundreds of happy guests who have discovered the soul of Karnataka in Lucknow.
                </p>
                <a 
                  href="https://www.google.com/maps/place/Benne+n'+Beans/@26.7890182,80.9092184,17.41z/data=!4m8!3m7!1s0x399bfd6ea814fd43:0xa1ec4be90c8c7f07!8m2!3d26.7884377!4d80.9114676!9m1!1b1!16s%2Fg%2F11yp_nr_8h?entry=ttu&g_ep=EgoyMDI2MDQyOS4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-[var(--benne-primary)] text-white px-10 py-5 rounded-full text-lg font-bold shadow-2xl shadow-[var(--benne-primary)]/30 hover:scale-105 transition-all duration-300"
                >
                  Write a Review
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
