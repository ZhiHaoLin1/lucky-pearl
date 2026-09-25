'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Coins } from 'lucide-react';

export type DepositRow = {
  id: string;
  amount_cents: number;
  method: string | null;
  platform: string | null;
  created_at: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  GD: 'Golden Dragon',
  MC: 'Magic City',
  RV: 'River',
  FP: 'Fire Phoenix',
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toDate(value: string) {
  return new Date(value.replace(' ', 'T') + 'Z');
}

function dateKey(value: string) {
  const d = toDate(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayHeader(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return toDate(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function depositLabel(method: string | null, platform: string | null) {
  if (platform) {
    return PLATFORM_LABELS[platform.toUpperCase()] ?? platform;
  }
  if (method) {
    return method.charAt(0).toUpperCase() + method.slice(1);
  }
  return 'Deposit';
}

function todayKey() {
  return dateKey(new Date().toISOString().slice(0, 19).replace('T', ' '));
}

export default function DepositsTab({ initialDeposits }: { initialDeposits: DepositRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'day' | 'range'>('all');
  const [singleDate, setSingleDate] = useState(todayKey());
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(todayKey());

  const allTotalCents = initialDeposits.reduce((sum, d) => sum + d.amount_cents, 0);

  const filtered = useMemo(() => {
    if (filterMode === 'day') {
      return initialDeposits.filter((d) => dateKey(d.created_at) === singleDate);
    }
    if (filterMode === 'range') {
      const lo = startDate <= endDate ? startDate : endDate;
      const hi = startDate <= endDate ? endDate : startDate;
      return initialDeposits.filter((d) => {
        const key = dateKey(d.created_at);
        return key >= lo && key <= hi;
      });
    }
    return initialDeposits;
  }, [initialDeposits, filterMode, singleDate, startDate, endDate]);

  const filteredTotalCents = filtered.reduce((sum, d) => sum + d.amount_cents, 0);

  const groups = useMemo(() => {
    const map = new Map<string, DepositRow[]>();
    filtered.forEach((d) => {
      const key = dateKey(d.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Coins className="w-5 h-5 text-gold-400 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
              Deposit History
            </h2>
            <p className="text-pearl-300/60 text-sm">
              {initialDeposits.length === 0
                ? 'No deposits yet'
                : `${initialDeposits.length} deposit${initialDeposits.length === 1 ? '' : 's'} · ${formatCents(
                    allTotalCents
                  )} total`}
            </p>
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-gold-400">
          {expanded ? 'Minimize' : 'View'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-white/10 pt-5">
          {initialDeposits.length === 0 ? (
            <p className="text-pearl-300/60 text-sm">
              Deposits you make will show up here with the date and time.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {(['all', 'day', 'range'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterMode(key)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      filterMode === key
                        ? 'border-gold-400 bg-gold-500/10 text-gold-400'
                        : 'border-white/10 bg-navy-900/60 text-pearl-300/70 hover:border-white/20'
                    }`}
                  >
                    {key === 'all' ? 'All time' : key === 'day' ? 'One day' : 'Date range'}
                  </button>
                ))}
              </div>

              {filterMode === 'day' && (
                <div className="mb-5">
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">Pick a day</span>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(event) => setSingleDate(event.target.value)}
                      className="rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-2.5 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                    />
                  </label>
                </div>
              )}

              {filterMode === 'range' && (
                <div className="flex flex-wrap gap-4 mb-5">
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">From</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-2.5 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                    />
                  </label>
                  <label className="block">
                    <span className="text-pearl-200 text-sm font-medium mb-1.5 block">To</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-2.5 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                    />
                  </label>
                </div>
              )}

              <p className="text-pearl-300/60 text-sm mb-4">
                Showing {filtered.length} deposit{filtered.length === 1 ? '' : 's'} · {formatCents(filteredTotalCents)}
              </p>

              {groups.length === 0 ? (
                <p className="text-pearl-300/60 text-sm">No deposits found for the selected dates.</p>
              ) : (
                <div className="space-y-5 max-h-[440px] overflow-y-auto pr-1">
                  {groups.map(([key, rows]) => (
                    <div key={key}>
                      <p className="text-pearl-300/50 text-xs uppercase tracking-wider mb-2">
                        {formatDayHeader(key)}
                      </p>
                      <div className="space-y-2">
                        {rows.map((deposit) => (
                          <div
                            key={deposit.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-pearl-100 font-semibold text-sm">
                                {formatCents(deposit.amount_cents)}
                              </p>
                              <p className="text-pearl-300/60 text-xs truncate">
                                {depositLabel(deposit.method, deposit.platform)}
                              </p>
                            </div>
                            <p className="shrink-0 text-pearl-300/50 text-xs">{formatTime(deposit.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
