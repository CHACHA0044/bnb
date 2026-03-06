import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SignatureItems from "@/components/SignatureItems";
import DosaProcess from "@/components/DosaProcess";
import CoffeeSection from "@/components/CoffeeSection";
import MenuGrid from "@/components/MenuGrid";
import OwnerStory from "@/components/OwnerStory";
import Gallery from "@/components/Gallery";
import LocationSection from "@/components/LocationSection";
import Footer from "@/components/Footer";
import ScrollIndicator from "@/components/ScrollIndicator";

/**
 * Home — assembles all sections of the Benne n Beans website.
 * Order: Hero → Signature Dishes → Dosa Process → Coffee →
 *        Menu → Owner Story → Gallery → Location → Footer
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <ScrollIndicator />
      <main>
        <Hero />
        <SignatureItems />
        <DosaProcess />
        <CoffeeSection />
        <MenuGrid />
        <OwnerStory />
        <Gallery />
        <LocationSection />
      </main>
      <Footer />
    </>
  );
}
