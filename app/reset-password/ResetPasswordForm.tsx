'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Gem } from 'lucide-react';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not reset your password.');
      }

      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not reset your password.';
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

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Reset your password</h1>

        {!token ? (
          <p className="text-pearl-300/80 text-base text-center leading-relaxed mt-4">
            This reset link is missing its token. Please use the link from your email, or request a new one from
            the Log In form.
          </p>
        ) : (
          <>
            <p className="text-pearl-300/80 text-base text-center mb-6 leading-relaxed">
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-pearl-200 text-sm font-medium mb-1.5 block">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </label>
              <label className="block">
                <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                {isSubmitting ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </>
        )}

        {message && <p className="mt-4 text-base text-pearl-100 leading-relaxed text-center">{message}</p>}
      </div>
    </main>
  );
}
