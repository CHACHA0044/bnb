import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OwnerStory from "@/components/OwnerStory";
import DosaProcess from "@/components/DosaProcess";

export const metadata = {
  title: "Our Story | Benne n Beans",
  description: "The journey of Benne n Beans — bringing authentic Karnataka flavours to Lucknow.",
};

/**
 * Story Page — High-end heritage layout.
 * Increased spacing to prevent Navbar overlap.
 */
export default function StoryPage() {
  return (
    <div className="bg-[var(--cream)] min-h-screen">
      <Navbar />
      <main className="pt-32 pb-0">
        <OwnerStory />
        <DosaProcess />
      </main>
      <Footer />
    </div>
  );
}
