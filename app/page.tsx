import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import GamesSection from '@/components/GamesSection';
import PaymentProcessorsSection from '@/components/PaymentProcessorsSection';
import SupportSection from '@/components/SupportSection';
import Footer from '@/components/Footer';
import AgeVerification from '@/components/AgeVerification';
import HoursNotice from '@/components/HoursNotice';

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-900 pb-20 lg:pb-0">
      <AgeVerification />
      <HoursNotice />
      <Navbar />
      <Hero />
      <PaymentProcessorsSection />
      <GamesSection />
      <SupportSection />
      <Footer />
    </main>
  );
}
