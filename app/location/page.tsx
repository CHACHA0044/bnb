import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LocationSection from "@/components/LocationSection";

export const metadata = {
  title: "Location | Benne n Beans",
  description: "Visit us at Ashiyana, Lucknow for the best Benne Dosa in town.",
};

export default function LocationPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <LocationSection />
      </main>
      <Footer />
    </>
  );
}
