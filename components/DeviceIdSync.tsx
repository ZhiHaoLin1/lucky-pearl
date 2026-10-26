'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'lp-device-id';
const SYNCED_KEY = 'lp-device-synced';

// Mirrors the browser's device id into localStorage (see /api/device) so clearing
// cookies alone doesn't make a returning browser look new. Runs once per tab session.
export default function DeviceIdSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SYNCED_KEY)) return;
      sessionStorage.setItem(SYNCED_KEY, '1');
    } catch {
      return;
    }

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}

    fetch('/api/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stored }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.id === 'string') {
          try {
            localStorage.setItem(STORAGE_KEY, data.id);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
