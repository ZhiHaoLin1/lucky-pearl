'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gem } from 'lucide-react';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    inviteCode: '',
    fullName: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not create the admin account.');
      }
      router.push('/admin');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not create the admin account.';
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #111f38 0%, #070c1a 40%, #04060f 100%)',
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gold-600/30 bg-navy-800 p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <Link href="/" className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            <Gem className="w-4 h-4 text-navy-900" />
          </div>
          <span className="text-gold-shimmer text-lg font-bold">Lucky Pearl</span>
        </Link>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Create admin account</h1>
        <p className="text-pearl-300/80 text-base text-center mb-6 leading-relaxed">
          Requires the admin invite code. This is not linked from the site.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Invite code</span>
            <input
              type="password"
              value={formData.inviteCode}
              onChange={(event) => handleChange('inviteCode', event.target.value)}
              required
              className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </label>
          <label className="block">
            <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Full name</span>
            <input
              type="text"
              value={formData.fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </label>
          <label className="block">
            <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Email</span>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => handleChange('email', event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </label>
          <label className="block">
            <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Password</span>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => handleChange('password', event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[52px] py-3.5 text-lg font-bold text-navy-900 bg-gold-gradient rounded-xl disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create admin account'}
          </button>
        </form>

        {message && <p className="mt-4 text-base text-pearl-100 leading-relaxed text-center">{message}</p>}
      </div>
    </main>
  );
}
