'use client';

import { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';

const STORAGE_KEY = 'lp_hours_notice_dismissed_at';
const SUPPRESS_MS = 24 * 60 * 60 * 1000;

export default function HoursNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (Date.now() - dismissedAt < SUPPRESS_MS) return;

    if (localStorage.getItem('lp_age_verified')) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }

    const onAgeVerified = () => {
      setTimeout(() => setVisible(true), 500);
    };
    window.addEventListener('lp-age-verified', onAgeVerified);
    return () => window.removeEventListener('lp-age-verified', onAgeVerified);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-[rgba(4,6,15,0.85)] px-4 py-6 sm:p-6 modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hours-notice-title"
      onClick={dismiss}
    >
      <div className="flex min-h-full min-h-[100dvh] items-center justify-center">
        <div
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-sm max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(160deg, #0c1528, #070c1a)',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 0 80px rgba(212,175,55,0.08), 0 40px 80px rgba(0,0,0,0.8)',
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 text-pearl-300/50 hover:text-pearl-100 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              <Clock className="w-6 h-6 text-navy-900" />
            </div>
          </div>

          <h2 id="hours-notice-title" className="text-xl font-bold text-gold-shimmer mb-3">
            Good to know
          </h2>

          <p className="text-pearl-200/85 text-base leading-relaxed mb-2">
            <strong className="text-white">Deposits are available 24/7.</strong>
          </p>
          <p className="text-pearl-200/85 text-base leading-relaxed mb-6">
            <strong className="text-white">Cashouts and customer support</strong> are available daily from{' '}
            <strong className="text-white">10:00 AM to 10:00 PM EST</strong>.
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl text-base font-bold text-navy-900 btn-press"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #f5d882, #c99a14)',
              boxShadow: '0 0 24px rgba(212,175,55,0.35)',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
