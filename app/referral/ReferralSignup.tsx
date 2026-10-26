'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import BirthdaySelect from '@/components/BirthdaySelect';
import Turnstile, { type TurnstileHandle } from '@/components/Turnstile';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const inputClass =
  'w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30';

// The "Claim my $10" button and the sign-up popup it opens, right on the referral page.
// The form talks to the main site's sign-up API, so the new account is logged in on the main
// site and we can send them straight to their dashboard.
export default function ReferralSignup({
  code,
  referrerFirstName,
  mainSiteUrl,
  buttonLabel,
}: {
  code: string | null;
  referrerFirstName: string | null;
  mainSiteUrl: string;
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', birthMonth: '', birthDay: '' });
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  // On the page without a personal link, a friend's invite code can be typed in instead.
  const [typedCode, setTypedCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (!adultConfirmed) return setError('Please confirm you are 18 or older.');
    if (TURNSTILE_SITE_KEY && !turnstileToken) return setError('Please complete the verification challenge.');

    const typed = typedCode.trim().toUpperCase();
    if (!code && typed && !/^[A-Z2-9]{8}$/.test(typed)) {
      return setError('That invite code doesn’t look right. It has 8 letters and numbers, or leave it empty.');
    }
    const refCode = code ?? (typed || undefined);

    setSaving(true);
    try {
      const response = await fetch(`${mainSiteUrl}/api/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken, refCode, adultConfirmed }),
      });
      const text = await response.text();
      let data: { error?: string; handoffToken?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {}
      if (!response.ok) throw new Error(data.error || 'Could not create your account. Please try again.');
      setDone(true);
      // Carry the new login over to the main site (falls back to the dashboard if there is no token).
      const destination = data.handoffToken
        ? `${mainSiteUrl}/api/auth/handoff?token=${encodeURIComponent(data.handoffToken)}`
        : `${mainSiteUrl}/dashboard`;
      setTimeout(() => window.location.assign(destination), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.');
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <a
        href={code ? `${mainSiteUrl}/?ref=${code}` : mainSiteUrl || '/'}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className="inline-block w-full sm:w-auto px-10 py-4 rounded-full bg-gold-gradient text-navy-900 font-bold text-lg shadow-lg animate-pulse-gold"
      >
        {buttonLabel}
      </a>

      {open && (
        <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-navy-900/85 px-4 py-6 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ref-join-title">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-gold-600/30 bg-navy-800 p-5 sm:p-6 text-left shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4 gap-3">
                <h2 id="ref-join-title" className="text-xl sm:text-2xl font-bold text-white">
                  {done ? 'You’re in!' : 'Join Lucky Pearl'}
                </h2>
                {!done && (
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close sign-up form" className="shrink-0 text-pearl-300 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-white/10 hover:text-gold-400">
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {done ? (
                <p className="text-pearl-200 text-base">Your account is ready. Taking you to your dashboard…</p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  {referrerFirstName && (
                    <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-pearl-100">
                      🎁 <span className="font-semibold text-gold-400">{referrerFirstName}</span> invited you. Sign up to get $10 in free game credit.
                    </div>
                  )}
                  {!code && (
                    <label className="block">
                      <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Friend’s invite code (optional)</span>
                      <input
                        className={`${inputClass} uppercase tracking-widest`}
                        value={typedCode}
                        onChange={(e) => setTypedCode(e.target.value)}
                        placeholder="e.g. AB3K9XQ2"
                        maxLength={8}
                        autoComplete="off"
                      />
                      <span className="text-pearl-300/60 text-xs mt-1.5 block">
                        It’s the 8 letters and numbers at the end of your friend’s link. Without one you still get an account, but not the invite bonus.
                      </span>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Full name</span>
                    <input className={inputClass} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required autoComplete="name" />
                  </label>
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Email</span>
                    <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" inputMode="email" />
                  </label>
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Phone number</span>
                    <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} required autoComplete="tel" inputMode="tel" />
                  </label>
                  <div className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Birthday (optional)</span>
                    <BirthdaySelect month={form.birthMonth} day={form.birthDay} onChange={({ month, day }) => setForm((prev) => ({ ...prev, birthMonth: month, birthDay: day }))} />
                    <span className="text-pearl-300/60 text-xs mt-1.5 block">Unlocks your birthday bonus. It can’t be changed later.</span>
                  </div>
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Password</span>
                    <input type="password" className={inputClass} value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} autoComplete="new-password" />
                  </label>
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Confirm password</span>
                    <input type="password" className={inputClass} value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required minLength={8} autoComplete="new-password" />
                  </label>

                  <label className="flex items-start gap-3 text-sm text-pearl-200">
                    <input type="checkbox" checked={adultConfirmed} onChange={(e) => setAdultConfirmed(e.target.checked)} className="mt-1 w-5 h-5 accent-yellow-500 shrink-0" />
                    <span>I confirm I am 18 or older and have never had a Lucky Pearl account.</span>
                  </label>

                  {TURNSTILE_SITE_KEY && (
                    <div className="flex justify-center">
                      <Turnstile ref={turnstileRef} siteKey={TURNSTILE_SITE_KEY} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
                    </div>
                  )}

                  {error && <p className="text-red-300 text-sm">{error}</p>}

                  <button type="submit" disabled={saving} className="w-full py-3.5 rounded-xl bg-gold-gradient text-navy-900 font-bold text-lg disabled:opacity-60">
                    {saving ? 'Creating your account…' : 'Create my account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
