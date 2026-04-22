import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import GamesSection from '@/components/GamesSection';
import PromotionsSection from '@/components/PromotionsSection';
import VIPSection from '@/components/VIPSection';
import SupportSection from '@/components/SupportSection';
import Footer from '@/components/Footer';
import AgeVerification from '@/components/AgeVerification';

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-900">
      <AgeVerification />
      <Navbar />
      <Hero />
      <GamesSection />
      <PromotionsSection />
      <VIPSection />
      <SupportSection />
      <Footer />
    </main>
  );
}
