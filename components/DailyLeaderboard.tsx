'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { americanNames1000 } from '@/lib/americanNames';

const GAME_PLATFORMS = ['Golden Dragon', 'Magic City', 'River', 'Fire Phoenix'] as const;

type LeaderboardEntry = {
  firstName: string;
  platform: (typeof GAME_PLATFORMS)[number];
  amount: number;
};

const EASTERN_TIMEZONE = 'America/New_York';

function getEasternDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function firstNameFromFull(fullName: string) {
  const part = fullName.split(/\s+/)[0];
  return part || fullName;
}

function getDailyTopTen(dateKey: string): LeaderboardEntry[] {
  const random = createSeededRandom(hashString(`leaderboard-${dateKey}`));
  const used = new Set<number>();
  const entries: LeaderboardEntry[] = [];

  while (entries.length < 10) {
    const index = Math.floor(random() * americanNames1000.length);
    if (used.has(index)) continue;
    used.add(index);

    const dollars = Math.floor(random() * 12000) + 250;
    const cents = random() < 0.5 ? 0 : 50;
    const platform = GAME_PLATFORMS[Math.floor(random() * GAME_PLATFORMS.length)];

    entries.push({
      firstName: firstNameFromFull(americanNames1000[index]),
      platform,
      amount: dollars + cents,
    });
  }

  return entries.sort((a, b) => b.amount - a.amount);
}

export default function DailyLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const currentDateKeyRef = useRef<string>('');
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    const loadForToday = () => {
      const dateKey = getEasternDateKey(new Date());
      currentDateKeyRef.current = dateKey;
      setEntries(getDailyTopTen(dateKey));
    };
    loadForToday();

    const timer = window.setInterval(() => {
      const dateKey = getEasternDateKey(new Date());
      if (dateKey !== currentDateKeyRef.current) {
        currentDateKeyRef.current = dateKey;
        setEntries(getDailyTopTen(dateKey));
      }
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="leaderboard" className="py-16 sm:py-20 px-6">
      <div className="max-w-4xl mx-auto rounded-2xl border border-gold-600/20 bg-white/[0.02] p-6 sm:p-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-gold-500/90 text-sm font-semibold tracking-wide uppercase mb-2">Today&apos;s highlights</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Top wins today
            </h2>
            <p className="text-pearl-300/70 text-base sm:text-lg mt-2 max-w-xl leading-relaxed">
              First names only. Each player&apos;s favorite game is shown — not their full identity.
            </p>
          </div>
          <span className="text-pearl-300/60 text-sm sm:text-base shrink-0">Updates at midnight ET</span>
        </div>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-navy-800/50 px-5 py-5 text-base text-pearl-300/70">
              Loading today&apos;s board…
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={`${entry.firstName}-${entry.platform}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-white/5 bg-navy-800/50 px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="w-8 text-lg font-bold text-gold-400 tabular-nums">{index + 1}</span>
                  <span className="text-pearl-50 text-lg sm:text-xl font-semibold">{entry.firstName}</span>
                  <span className="text-pearl-300/80 text-base sm:text-lg">
                    on <span className="text-pearl-100">{entry.platform}</span>
                  </span>
                </div>
                <span className="text-emerald-400 font-bold text-lg sm:text-xl tabular-nums">
                  {formatter.format(entry.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
