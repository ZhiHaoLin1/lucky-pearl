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

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

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
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-[rgba(4,6,15,0.92)] px-4 py-6 sm:p-6 modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-verify-title"
    >
      <div className="flex min-h-full min-h-[100dvh] items-center justify-center">
        <div
          className="relative w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl p-6 sm:p-8 text-center"
          style={{
            background: 'linear-gradient(160deg, #0c1528, #070c1a)',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 0 80px rgba(212,175,55,0.08), 0 40px 80px rgba(0,0,0,0.8)',
          }}
        >
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.5)]">
              <Gem className="w-7 h-7 text-navy-900" />
            </div>
          </div>

          <h2 id="age-verify-title" className="text-2xl sm:text-3xl font-bold text-gold-shimmer mb-3">
            Lucky Pearl
          </h2>

          <div className="h-px bg-gradient-to-r from-transparent via-gold-DEFAULT/30 to-transparent my-4" />

          <p className="text-pearl-300/70 text-sm font-semibold uppercase tracking-wide mb-3">
            Age verification required
          </p>

          <p className="text-pearl-200/85 text-lg sm:text-xl leading-relaxed mb-6">
            You must be <strong className="text-white">18 or older</strong> to use this site. Tap the button below if you are 18+.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleVerify}
              className="w-full min-h-[52px] py-4 px-4 rounded-xl text-base font-bold text-navy-900 btn-press"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #f5d882, #c99a14)',
                boxShadow: '0 0 30px rgba(212,175,55,0.4)',
              }}
            >
              I am 18+ — enter site
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl text-base text-pearl-300/70 border border-pearl-300/20 hover:border-pearl-300/35 transition-colors"
            >
              I am under 18
            </button>
          </div>

          <p className="text-pearl-300/40 text-sm mt-5 leading-relaxed">
            Please play responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
