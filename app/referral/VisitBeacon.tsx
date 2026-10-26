'use client';

import { useEffect } from 'react';

// Tells the server someone opened this referral link, so the admin can see clicks per link.
export default function VisitBeacon({ code }: { code: string }) {
  useEffect(() => {
    fetch('/api/referrals/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [code]);
  return null;
}
