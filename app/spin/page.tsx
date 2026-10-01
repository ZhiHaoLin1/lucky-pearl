'use client';

import { useEffect, useRef, useState } from 'react';

// ── Edit the wheel here ─────────────────────────────────────────────
// `weight` is the relative chance of landing on a slice (bigger = likelier).
const PRIZES = [
  { label: '$1 Free Play', color: '#111f38', weight: 30 },
  { label: '$2 Free Play', color: '#9b1c2e', weight: 24 },
  { label: '$5 Free Play', color: '#1a6b4a', weight: 16 },
  { label: 'Try Again Tomorrow', color: '#162847', weight: 20 },
  { label: '$10 Free Play', color: '#a07a0a', weight: 7 },
  { label: '$25 Free Play', color: '#6b2fa0', weight: 2.5 },
  { label: '$50 Free Play', color: '#c99a14', weight: 0.5 },
];
const SPIN_MS = 5500;
const STORAGE_KEY = 'lp-daily-wheel';
// ────────────────────────────────────────────────────────────────────

const SLICE = (Math.PI * 2) / PRIZES.length;
const SIZE = 560;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

function drawWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const c = SIZE / 2;
  const R = c - 14;
  ctx.clearRect(0, 0, SIZE, SIZE);

  PRIZES.forEach((p, i) => {
    const a0 = i * SLICE - Math.PI / 2 - SLICE / 2;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, R, a0, a0 + SLICE);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(a0 + SLICE / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0ebe0';
    ctx.font = 'bold 24px "Segoe UI", Tahoma, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(p.label, R - 24, 0, R * 0.62);
    ctx.restore();
  });

  // outer gold rim with pegs
  ctx.beginPath();
  ctx.arc(c, c, R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#f5d882';
  ctx.lineWidth = 10;
  ctx.stroke();
  PRIZES.forEach((_, i) => {
    const a = i * SLICE - Math.PI / 2 - SLICE / 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * (R + 5), c + Math.sin(a) * (R + 5), 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fefefe';
    ctx.fill();
  });

  // hub
  const g = ctx.createRadialGradient(c, c, 4, c, c, 44);
  g.addColorStop(0, '#fefefe');
  g.addColorStop(1, '#c8bca3');
  ctx.beginPath();
  ctx.arc(c, c, 44, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.stroke();
}

export default function DailyWheelPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [usedToday, setUsedToday] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.day === todayKey()) {
        setUsedToday(true);
        setResult(saved.prize);
      }
    } catch {}
    setReady(true);
  }, []);

  // countdown to local midnight once today's spin is used
  useEffect(() => {
    if (!usedToday) return;
    const tick = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
      const p = (n: number) => String(n).padStart(2, '0');
      setCountdown(`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`);
      if (s === 0) {
        setUsedToday(false);
        setResult(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [usedToday]);

  const spin = () => {
    if (spinning || usedToday) return;
    const idx = pickPrize();
    // slice idx is centred under the top pointer when rotation ≡ -idx*SLICE
    const jitter = (Math.random() - 0.5) * SLICE * 0.7;
    const turns = 6 + Math.floor(Math.random() * 3);
    const base = Math.ceil(rotation.current / (Math.PI * 2)) * Math.PI * 2;
    const target = base + turns * Math.PI * 2 - idx * SLICE + jitter;
    rotation.current = target;
    setSpinning(true);
    setResult(null);
    if (canvasRef.current) {
      canvasRef.current.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.1, 1)`;
      canvasRef.current.style.transform = `rotate(${target}rad)`;
    }
    setTimeout(() => {
      setSpinning(false);
      setResult(idx);
      setUsedToday(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: todayKey(), prize: idx }));
      } catch {}
    }, SPIN_MS + 100);
  };

  const prize = result !== null ? PRIZES[result] : null;

  return (
    <main className="min-h-screen bg-dark-gradient flex flex-col items-center justify-center px-4 py-10 text-center">
      <p className="font-cinzel tracking-[0.3em] text-gold text-sm uppercase">Lucky Pearl</p>
      <h1 className="text-gold-shimmer font-cinzel text-4xl sm:text-5xl font-bold mt-2">Daily Prize Wheel</h1>
      <p className="text-pearl-300 mt-3 max-w-md">One free spin every day. Come back tomorrow for another chance.</p>

      <div className="relative mt-8 w-full max-w-[420px] aspect-square">
        {/* pointer */}
        <div
          className="absolute left-1/2 -top-2 z-10 -translate-x-1/2 drop-shadow-lg"
          style={{
            width: 0,
            height: 0,
            borderLeft: '16px solid transparent',
            borderRight: '16px solid transparent',
            borderTop: '34px solid #f5d882',
          }}
        />
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="w-full h-full rounded-full shadow-[0_0_60px_rgba(212,175,55,0.35)]"
          style={{ transform: 'rotate(0rad)' }}
        />
      </div>

      <button
        onClick={spin}
        disabled={!ready || spinning || usedToday}
        className="mt-8 px-12 py-4 rounded-full bg-gold-gradient text-navy-900 font-cinzel font-bold text-xl tracking-wider shadow-lg transition enabled:hover:scale-105 enabled:animate-pulse-gold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spinning ? 'Spinning…' : usedToday ? 'Spun Today' : 'SPIN'}
      </button>

      <div className="mt-6 min-h-[5.5rem]" aria-live="polite">
        {prize && !spinning && (
          <>
            <p className="text-pearl-300 text-sm uppercase tracking-widest">
              {prize.label.startsWith('Try') ? 'Not this time' : 'You won'}
            </p>
            <p className="text-gold font-cinzel text-3xl font-bold mt-1">{prize.label}</p>
            {!prize.label.startsWith('Try') && (
              <p className="text-pearl-300 text-sm mt-2">Message us with a screenshot of this to claim your prize.</p>
            )}
          </>
        )}
        {usedToday && !spinning && (
          <p className="text-pearl-400 text-sm mt-3">Next spin in {countdown}</p>
        )}
      </div>
    </main>
  );
}
