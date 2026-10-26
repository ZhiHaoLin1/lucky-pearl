import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import GamesSection from '@/components/GamesSection';
import PaymentProcessorsSection from '@/components/PaymentProcessorsSection';
import SupportSection from '@/components/SupportSection';
import Footer from '@/components/Footer';
import EntryModals from '@/components/EntryModals';

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-900 pb-20 lg:pb-0">
      <EntryModals />
      <Navbar />
      <Hero />
      <PaymentProcessorsSection />
      <GamesSection />
      <SupportSection />
      <Footer />
    </main>
  );
}
