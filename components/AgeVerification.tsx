'use client';

import { useState, useEffect } from 'react';
import { Gem } from 'lucide-react';

export default function AgeVerification() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('lp_age_verified');
    if (!verified) {
      setTimeout(() => setVisible(true), 600);
    }
  }, []);

  const handleVerify = () => {
    localStorage.setItem('lp_age_verified', '1');
    setVisible(false);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center modal-backdrop"
      style={{ background: 'rgba(4,6,15,0.9)' }}
    >
      <div
        className="relative max-w-md w-full mx-6 rounded-2xl p-10 text-center"
        style={{
          background: 'linear-gradient(160deg, #0c1528, #070c1a)',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 0 80px rgba(212,175,55,0.08), 0 40px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Glow top */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.5)]">
            <Gem className="w-7 h-7 text-navy-900" />
          </div>
        </div>

        <h2
          className="text-2xl font-bold text-gold-shimmer mb-2"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Lucky Pearl
        </h2>

        <div className="h-px bg-gradient-to-r from-transparent via-gold-DEFAULT/30 to-transparent my-5" />

        <p
          className="text-pearl-300/50 text-xs tracking-[0.3em] uppercase mb-3"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Age Verification Required
        </p>

        <p
          className="text-pearl-200/70 text-lg leading-relaxed mb-8"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          You must be <strong className="text-white">18 years of age or older</strong> to enter this site.
          By clicking "I Am 18+" you confirm that you are of legal gambling age in your jurisdiction.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleVerify}
            className="w-full py-4 rounded-xl text-sm font-bold tracking-[0.2em] uppercase text-navy-900 btn-press"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #f5d882, #c99a14)',
              fontFamily: "'Cinzel', serif",
              boxShadow: '0 0 30px rgba(212,175,55,0.4)',
            }}
          >
            I Am 18+ — Enter Site
          </button>
          <button
            onClick={handleDecline}
            className="w-full py-3 rounded-xl text-sm tracking-widest uppercase text-pearl-300/40 border border-pearl-300/10 hover:border-pearl-300/20 transition-all duration-300"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            I Am Under 18
          </button>
        </div>

        <p className="text-pearl-300/25 text-xs mt-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          This site uses cookies to ensure compliance with age verification requirements.
          Please gamble responsibly.
        </p>
      </div>
    </div>
  );
}
