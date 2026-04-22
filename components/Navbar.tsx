'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Gem } from 'lucide-react';

const navLinks = [
  { label: 'Games', href: '#games' },
  { label: 'Jackpots', href: '#jackpots' },
  { label: 'Promotions', href: '#promotions' },
  { label: 'VIP Club', href: '#vip' },
  { label: 'Support', href: '#support' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            <button className="px-5 py-2 text-xs tracking-[0.2em] uppercase text-gold-400 border border-gold-600/40 rounded hover:border-gold-400 hover:bg-gold-DEFAULT/5 transition-all duration-300">
              Sign In
            </button>
            <button className="px-5 py-2 text-xs tracking-[0.2em] uppercase text-navy-900 bg-gold-gradient rounded font-semibold shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all duration-300 btn-press">
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
            <div className="pt-4 flex gap-3">
              <button className="flex-1 py-2.5 text-xs tracking-widest uppercase text-gold-400 border border-gold-600/40 rounded hover:border-gold-400 transition-all duration-300">
                Sign In
              </button>
              <button className="flex-1 py-2.5 text-xs tracking-widest uppercase text-navy-900 bg-gold-gradient rounded font-semibold">
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
