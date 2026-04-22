'use client';

import { useEffect, useRef, useState } from 'react';

const JACKPOT_START = 4_872_341;

export default function Hero() {
  const [jackpot, setJackpot] = useState(JACKPOT_START);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
    // Tick jackpot up
    const interval = setInterval(() => {
      setJackpot((prev) => prev + Math.floor(Math.random() * 37 + 5));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Array<{
      x: number; y: number; size: number; speedY: number; speedX: number;
      opacity: number; color: string; life: number; maxLife: number;
    }> = [];

    const colors = ['rgba(212,175,55', 'rgba(240,235,224', 'rgba(245,216,130'];

    const spawnParticle = () => {
      const maxLife = 120 + Math.random() * 180;
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        size: Math.random() * 2.5 + 0.5,
        speedY: -(Math.random() * 0.8 + 0.3),
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife,
      });
    };

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (Math.random() < 0.3) spawnParticle();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.speedX;
        p.y += p.speedY;
        const progress = p.life / p.maxLife;
        p.opacity = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color},${p.opacity * 0.7})`;
        ctx.fill();

        if (p.life >= p.maxLife || p.y < -10) {
          particles.splice(i, 1);
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const formatJackpot = (n: number) =>
    '$' + n.toLocaleString('en-US');

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #111f38 0%, #070c1a 40%, #04060f 100%)',
      }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.8 }}
      />

      {/* Stars bg */}
      <div className="absolute inset-0 stars-bg opacity-60" />

      {/* Radial glow center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Decorative arcs */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <ellipse cx="720" cy="450" rx="500" ry="380" fill="none" stroke="#d4af37" strokeWidth="0.5" />
        <ellipse cx="720" cy="450" rx="600" ry="460" fill="none" stroke="#d4af37" strokeWidth="0.3" />
        <ellipse cx="720" cy="450" rx="700" ry="540" fill="none" stroke="#d4af37" strokeWidth="0.2" />
      </svg>

      {/* Corner ornaments */}
      <div className="absolute top-28 left-8 opacity-30 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path d="M0 80 L0 0 L80 0" stroke="#d4af37" strokeWidth="1.5" />
          <path d="M10 80 L10 10 L80 10" stroke="#d4af37" strokeWidth="0.5" />
          <circle cx="10" cy="10" r="3" fill="#d4af37" />
        </svg>
      </div>
      <div className="absolute top-28 right-8 opacity-30 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path d="M80 80 L80 0 L0 0" stroke="#d4af37" strokeWidth="1.5" />
          <path d="M70 80 L70 10 L0 10" stroke="#d4af37" strokeWidth="0.5" />
          <circle cx="70" cy="10" r="3" fill="#d4af37" />
        </svg>
      </div>

      {/* Content */}
      <div
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-600/30 bg-gold-DEFAULT/5 mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
          <span className="text-gold-400 text-xs tracking-[0.3em] uppercase">Est. Premium Gaming</span>
        </div>

        {/* Main headline */}
        <h1
          className={`text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-4 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="text-gold-shimmer block">Lucky Pearl</span>
        </h1>

        {/* Tagline */}
        <p
          className={`text-pearl-200/60 text-lg sm:text-xl tracking-[0.25em] uppercase mb-3 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}
        >
          Where Fortune Favors the Bold
        </p>

        {/* Ornament divider */}
        <div
          className={`ornament-divider max-w-xs mx-auto mb-10 transition-all duration-1000 delay-400 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-gold-600 text-lg">❋</span>
        </div>

        {/* Live Jackpot */}
        <div
          className={`mb-12 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <p className="text-pearl-300/40 text-xs tracking-[0.4em] uppercase mb-2">Live Grand Jackpot</p>
          <div
            className="text-4xl sm:text-5xl lg:text-6xl font-black jackpot-glow"
            style={{ color: '#f5d882' }}
          >
            {formatJackpot(jackpot)}
          </div>
        </div>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <a
            href="#games"
            className="group relative px-10 py-4 text-sm tracking-[0.25em] uppercase text-navy-900 font-bold overflow-hidden rounded btn-press"
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f5d882 50%, #c99a14 100%)' }}
          >
            <span className="relative z-10">Play Now</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a
            href="#vip"
            className="px-10 py-4 text-sm tracking-[0.25em] uppercase text-gold-400 border border-gold-600/40 rounded hover:border-gold-400 hover:bg-gold-DEFAULT/5 transition-all duration-300 btn-press"
          >
            VIP Club
          </a>
        </div>

        {/* Trust indicators */}
        <div
          className={`mt-14 flex flex-wrap justify-center gap-8 transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          {[
            { label: 'Players Online', value: '12,847' },
            { label: 'Games Available', value: '500+' },
            { label: 'Total Payouts', value: '$48M+' },
            { label: 'Member Rating', value: '4.9★' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl font-bold" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>
                {stat.value}
              </div>
              <div className="text-pearl-300/40 text-xs tracking-widest uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-900 to-transparent pointer-events-none" />

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="text-pearl-300 text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: "'Cinzel', serif" }}>Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-gold-DEFAULT to-transparent animate-pulse" />
      </div>
    </section>
  );
}
