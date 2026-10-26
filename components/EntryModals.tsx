'use client';

import { useEffect, useState } from 'react';
import AgeVerification from './AgeVerification';
import HoursNotice from './HoursNotice';

// The homepage's first-visit popups (18+ check, support hours notice).
//
// Someone arriving from a referral link (/?ref=CODE) should land straight on the sign-up popup, so
// for them these are held back and a plain backdrop covers the homepage. The sign-up popup has its
// own "I am 18 or older" box they must tick. If they close the popup and carry on to the site,
// the normal popups appear as usual.
export default function EntryModals() {
  const [referralEntry, setReferralEntry] = useState<boolean | null>(null);

  useEffect(() => {
    const code = (new URLSearchParams(window.location.search).get('ref') ?? '').trim().toUpperCase();
    setReferralEntry(/^[A-Z2-9]{8}$/.test(code));
    const onJoinClosed = () => setReferralEntry(false);
    window.addEventListener('lp-join-closed', onJoinClosed);
    return () => window.removeEventListener('lp-join-closed', onJoinClosed);
  }, []);

  // Wait for the first check so the 18+ popup never flashes for a referral visitor.
  if (referralEntry === null) return null;

  if (referralEntry) {
    return (
      <div
        className="fixed inset-0 z-[55]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #111f38 0%, #070c1a 45%, #04060f 100%)' }}
        aria-hidden
      />
    );
  }

  return (
    <>
      <AgeVerification />
      <HoursNotice />
    </>
  );
}
