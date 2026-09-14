'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 text-sm text-pearl-200 border border-gold-600/25 rounded-lg hover:border-gold-400 hover:text-gold-400 transition-all duration-300 disabled:opacity-60"
    >
      <LogOut className="w-4 h-4" />
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
