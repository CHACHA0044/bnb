import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";

export const metadata = {
  title: "Gallery | Benne n Beans",
  description: "A visual journey through the flavours and moments at Benne n Beans.",
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[var(--coffee)]">
      <Navbar />
      <main className="pt-24">
        <Gallery />
      </main>
      <Footer />
    </div>
  );
}
