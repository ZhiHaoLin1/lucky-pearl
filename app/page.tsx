import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import DailyLeaderboard from '@/components/DailyLeaderboard';
import GamesSection from '@/components/GamesSection';
import VIPSection from '@/components/VIPSection';
import PaymentProcessorsSection from '@/components/PaymentProcessorsSection';
import SupportSection from '@/components/SupportSection';
import Footer from '@/components/Footer';
import AgeVerification from '@/components/AgeVerification';

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-900">
      <AgeVerification />
      <Navbar />
      <Hero />
      <PaymentProcessorsSection />
      <DailyLeaderboard />
      <GamesSection />
      <VIPSection />
      <SupportSection />
      <Footer />
    </main>
  );
}
