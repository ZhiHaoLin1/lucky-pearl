'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Gem, Gamepad2, Wallet, Headphones } from 'lucide-react';

const navLinks = [
  { label: 'Games', href: '#games' },
  { label: 'Payments', href: '#payments' },
  { label: 'Jackpots', href: '#jackpots' },
  { label: 'VIP Club', href: '#vip' },
  { label: 'Support', href: '#support' },
];

const mobileQuickLinks = [
  { label: 'Games', href: '#games', icon: Gamepad2 },
  { label: 'Pay', href: '#payments', icon: Wallet },
  { label: 'Help', href: '#support', icon: Headphones },
];

export default function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredGame: '',
    password: '',
    confirmPassword: '',
  });

  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const [forgotOpen, setForgotOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLoggedIn(Boolean(data?.loggedIn));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onOpenJoin = () => {
      setSubmitMessage(null);
      setLoginOpen(false);
      setForgotOpen(false);
      setJoinOpen(true);
      setMobileOpen(false);
    };
    window.addEventListener('lp-open-join', onOpenJoin);
    return () => window.removeEventListener('lp-open-join', onOpenJoin);
  }, []);

  useEffect(() => {
    if (!joinOpen && !loginOpen && !forgotOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [joinOpen, loginOpen, forgotOpen]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoginInputChange = (field: keyof typeof loginData, value: string) => {
    setLoginData((prev) => ({ ...prev, [field]: value }));
  };

  const handleJoinSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setSubmitMessage('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setSubmitMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not create your account.');
      }

      setJoinOpen(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        preferredGame: '',
        password: '',
        confirmPassword: '',
      });
      setLoggedIn(true);
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create your account.';
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage(null);
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not log you in.');
      }

      setLoginOpen(false);
      setLoginData({ email: '', password: '' });
      setLoggedIn(true);
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not log you in.';
      setLoginMessage(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const showJoinForm = () => {
    setSubmitMessage(null);
    setLoginOpen(false);
    setForgotOpen(false);
    setJoinOpen(true);
    setMobileOpen(false);
  };

  const showLoginForm = () => {
    setLoginMessage(null);
    setJoinOpen(false);
    setForgotOpen(false);
    setLoginOpen(true);
    setMobileOpen(false);
  };

  const showForgotForm = () => {
    setForgotMessage(null);
    setForgotEmail(loginData.email);
    setJoinOpen(false);
    setLoginOpen(false);
    setForgotOpen(true);
    setMobileOpen(false);
  };

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotMessage(null);
    setIsSendingReset(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      setForgotMessage(data?.message || 'If an account exists for that email, a reset link is on its way.');
    } catch {
      setForgotMessage('If an account exists for that email, a reset link is on its way.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const goToDashboard = () => {
    setMobileOpen(false);
    router.push('/dashboard');
  };

  const primaryCtaLabel = authLoading ? 'Join Now' : loggedIn ? 'Dashboard' : 'Join Now';
  const primaryCtaAction = loggedIn ? goToDashboard : showJoinForm;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-navy-900/95 backdrop-blur-md border-b border-gold-600/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-navy-900/80 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink">
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-navy-900" />
                </div>
              </div>
              <span className="text-gold-shimmer text-lg sm:text-xl font-bold leading-tight truncate">
                Lucky Pearl
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-pearl-200/70 hover:text-gold-400 text-sm transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              {!authLoading && !loggedIn && (
                <button
                  type="button"
                  onClick={showLoginForm}
                  className="px-4 py-2.5 text-sm text-pearl-200/80 hover:text-gold-400 transition-colors duration-300"
                >
                  Log In
                </button>
              )}
              <button
                type="button"
                onClick={primaryCtaAction}
                className="px-5 py-2.5 text-sm text-navy-900 bg-gold-gradient rounded-lg font-semibold shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all duration-300 btn-press"
              >
                {primaryCtaLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-gold-400 p-3 -mr-2 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg border border-gold-600/20"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden mobile-menu-open bg-navy-800/98 backdrop-blur-md border-t border-gold-600/20 max-h-[70dvh] overflow-y-auto">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[52px] text-pearl-100 hover:text-gold-400 text-lg font-medium transition-colors py-3 px-3 rounded-lg hover:bg-white/5 border-b border-gold-600/10"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={primaryCtaAction}
                  className="w-full min-h-[52px] py-3.5 text-lg font-bold text-navy-900 bg-gold-gradient rounded-xl"
                >
                  {primaryCtaLabel}
                </button>
                {!authLoading && !loggedIn && (
                  <button
                    type="button"
                    onClick={showLoginForm}
                    className="w-full min-h-[48px] py-3 text-base font-semibold text-pearl-200 border border-gold-600/25 rounded-xl"
                  >
                    Log In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {joinOpen && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-navy-900/80 px-4 py-6 sm:p-6 modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-form-title"
        >
          <div className="flex min-h-full min-h-[100dvh] items-center justify-center">
            <div className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-gold-600/30 bg-navy-800 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-5 gap-3">
                <h2 id="join-form-title" className="text-xl sm:text-2xl font-bold text-white">
                  Join Lucky Pearl
                </h2>
                <button
                  type="button"
                  onClick={() => setJoinOpen(false)}
                  className="shrink-0 text-pearl-300 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg border border-white/10 hover:text-gold-400"
                  aria-label="Close join form"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-pearl-300/80 text-base mb-5 leading-relaxed">
                Create your account to get instant access to your dashboard and games.
              </p>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Full name</span>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => handleInputChange('fullName', event.target.value)}
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
                    onChange={(event) => handleInputChange('email', event.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Phone number</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => handleInputChange('phone', event.target.value)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Favorite game (optional)</span>
                  <input
                    type="text"
                    value={formData.preferredGame}
                    onChange={(event) => handleInputChange('preferredGame', event.target.value)}
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Password</span>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(event) => handleInputChange('password', event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Confirm password</span>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
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
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              {submitMessage && (
                <p className="mt-4 text-base text-pearl-100 leading-relaxed">{submitMessage}</p>
              )}

              <p className="mt-5 text-center text-sm text-pearl-300/70">
                Already have an account?{' '}
                <button type="button" onClick={showLoginForm} className="text-gold-400 hover:text-gold-300 underline underline-offset-2">
                  Log in
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {loginOpen && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-navy-900/80 px-4 py-6 sm:p-6 modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-form-title"
        >
          <div className="flex min-h-full min-h-[100dvh] items-center justify-center">
            <div className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-gold-600/30 bg-navy-800 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-5 gap-3">
                <h2 id="login-form-title" className="text-xl sm:text-2xl font-bold text-white">
                  Log In
                </h2>
                <button
                  type="button"
                  onClick={() => setLoginOpen(false)}
                  className="shrink-0 text-pearl-300 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg border border-white/10 hover:text-gold-400"
                  aria-label="Close login form"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-pearl-300/80 text-base mb-5 leading-relaxed">
                Welcome back — log in to reach your dashboard.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Email</span>
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(event) => handleLoginInputChange('email', event.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Password</span>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(event) => handleLoginInputChange('password', event.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={showForgotForm}
                    className="text-sm text-gold-400 hover:text-gold-300 underline underline-offset-2"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full min-h-[52px] py-3.5 text-lg font-bold text-navy-900 bg-gold-gradient rounded-xl disabled:opacity-60"
                >
                  {isLoggingIn ? 'Logging in…' : 'Log in'}
                </button>
              </form>

              {loginMessage && (
                <p className="mt-4 text-base text-pearl-100 leading-relaxed">{loginMessage}</p>
              )}

              <p className="mt-5 text-center text-sm text-pearl-300/70">
                New here?{' '}
                <button type="button" onClick={showJoinForm} className="text-gold-400 hover:text-gold-300 underline underline-offset-2">
                  Create an account
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {forgotOpen && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-navy-900/80 px-4 py-6 sm:p-6 modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-form-title"
        >
          <div className="flex min-h-full min-h-[100dvh] items-center justify-center">
            <div className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-gold-600/30 bg-navy-800 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-5 gap-3">
                <h2 id="forgot-form-title" className="text-xl sm:text-2xl font-bold text-white">
                  Reset Password
                </h2>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="shrink-0 text-pearl-300 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg border border-white/10 hover:text-gold-400"
                  aria-label="Close reset password form"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-pearl-300/80 text-base mb-5 leading-relaxed">
                Enter your account email and we will send you a link to reset your password.
              </p>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Email</span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full min-h-[52px] py-3.5 text-lg font-bold text-navy-900 bg-gold-gradient rounded-xl disabled:opacity-60"
                >
                  {isSendingReset ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              {forgotMessage && (
                <p className="mt-4 text-base text-pearl-100 leading-relaxed">{forgotMessage}</p>
              )}

              <p className="mt-5 text-center text-sm text-pearl-300/70">
                <button type="button" onClick={showLoginForm} className="text-gold-400 hover:text-gold-300 underline underline-offset-2">
                  Back to log in
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gold-600/25 bg-navy-900/98 backdrop-blur-md safe-bottom">
        <div className="grid grid-cols-4 gap-0">
          {mobileQuickLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 min-h-[64px] py-2 text-pearl-200 hover:text-gold-400 active:bg-white/5"
            >
              <item.icon className="w-6 h-6" aria-hidden />
              <span className="text-xs font-semibold">{item.label}</span>
            </a>
          ))}
          <button
            type="button"
            onClick={primaryCtaAction}
            className="flex flex-col items-center justify-center gap-1 min-h-[64px] py-2 text-gold-400 active:bg-gold-500/10"
          >
            <Gem className="w-6 h-6" aria-hidden />
            <span className="text-xs font-bold">{loggedIn ? 'Account' : 'Join'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
