'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Gem } from 'lucide-react';

const navLinks = [
  { label: 'Games', href: '#games' },
  { label: 'Payments', href: '#payments' },
  { label: 'Jackpots', href: '#jackpots' },
  { label: 'VIP Club', href: '#vip' },
  { label: 'Support', href: '#support' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredGame: '',
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleJoinSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not submit form.');
      }

      setSubmitMessage('Thanks! Your request was sent successfully.');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        preferredGame: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit form.';
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-md border-b border-gold-600/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'bg-transparent'
      }`}
      style={{ fontFamily: "'Cinzel', serif" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.7)] transition-all duration-300">
                <Gem className="w-5 h-5 text-navy-900" />
              </div>
              <div className="absolute -inset-1 rounded-full bg-gold-DEFAULT/20 blur-sm group-hover:bg-gold-DEFAULT/40 transition-all duration-300" />
            </div>
            <div>
              <span className="text-gold-shimmer text-xl font-bold tracking-widest uppercase text-gold-shimmer block">
                Lucky Pearl
              </span>
              <span className="text-pearl-300/50 text-[9px] tracking-[0.3em] uppercase">Premium Gaming</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-pearl-200/70 hover:text-gold-400 text-xs tracking-[0.2em] uppercase transition-colors duration-300 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold-DEFAULT group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => {
                setSubmitMessage(null);
                setJoinOpen(true);
              }}
              className="px-5 py-2 text-xs tracking-[0.2em] uppercase text-navy-900 bg-gold-gradient rounded font-semibold shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all duration-300 btn-press"
            >
              Join Now
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-gold-400 p-2"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden mobile-menu-open bg-navy-800/98 backdrop-blur-md border-t border-gold-600/20">
          <div className="px-6 py-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-pearl-200/70 hover:text-gold-400 text-sm tracking-[0.2em] uppercase transition-colors duration-300 py-2 border-b border-gold-600/10"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setSubmitMessage(null);
                  setJoinOpen(true);
                }}
                className="w-full py-2.5 text-xs tracking-widest uppercase text-navy-900 bg-gold-gradient rounded font-semibold"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}

      {joinOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 modal-backdrop bg-navy-900/70">
          <div className="w-full max-w-md rounded-2xl border border-gold-600/30 bg-navy-800 p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white tracking-wide uppercase">Join Now</h2>
              <button
                onClick={() => setJoinOpen(false)}
                className="text-pearl-300/70 hover:text-gold-400 transition-colors"
                aria-label="Close join form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <input
                type="text"
                value={formData.fullName}
                onChange={(event) => handleInputChange('fullName', event.target.value)}
                placeholder="Full name"
                required
                className="w-full rounded-lg bg-navy-900 border border-gold-600/20 px-3 py-2.5 text-sm text-pearl-100 placeholder:text-pearl-300/40 focus:border-gold-400 focus:outline-none"
              />
              <input
                type="email"
                value={formData.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
                placeholder="Email address"
                required
                className="w-full rounded-lg bg-navy-900 border border-gold-600/20 px-3 py-2.5 text-sm text-pearl-100 placeholder:text-pearl-300/40 focus:border-gold-400 focus:outline-none"
              />
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => handleInputChange('phone', event.target.value)}
                placeholder="Phone number"
                required
                className="w-full rounded-lg bg-navy-900 border border-gold-600/20 px-3 py-2.5 text-sm text-pearl-100 placeholder:text-pearl-300/40 focus:border-gold-400 focus:outline-none"
              />
              <input
                type="text"
                value={formData.preferredGame}
                onChange={(event) => handleInputChange('preferredGame', event.target.value)}
                placeholder="Preferred game (optional)"
                className="w-full rounded-lg bg-navy-900 border border-gold-600/20 px-3 py-2.5 text-sm text-pearl-100 placeholder:text-pearl-300/40 focus:border-gold-400 focus:outline-none"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 text-xs tracking-widest uppercase text-navy-900 bg-gold-gradient rounded font-semibold disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Submit'}
              </button>
            </form>

            {submitMessage && (
              <p className="mt-3 text-xs text-pearl-200/80">{submitMessage}</p>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
