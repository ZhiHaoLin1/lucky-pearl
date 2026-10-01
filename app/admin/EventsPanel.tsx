'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Trash2, X } from 'lucide-react';
import { VIP_TIERS } from '@/lib/vip';
import type { EventRecord } from '@/lib/events';

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

const TIER_OPTIONS = VIP_TIERS.map((tier, index) => ({
  value: tier.name,
  label: index === 0 ? 'Everyone (Pearl and up)' : index === VIP_TIERS.length - 1 ? `${tier.name} only` : `${tier.name} and above`,
}));

// "YYYY-MM-DDTHH:mm" for right now in US Eastern, the format a datetime-local input expects.
function easternNowInputValue() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

const formatEastern = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

type Status = 'upcoming' | 'running' | 'ended';
const statusOf = (event: EventRecord): Status => {
  const now = Date.now();
  if (new Date(event.startsAt).getTime() > now) return 'upcoming';
  return new Date(event.endsAt).getTime() > now ? 'running' : 'ended';
};

const inputClass =
  'w-full rounded-lg bg-navy-900 border border-gold-600/25 px-3 py-2.5 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30';

const emptyForm = () => ({
  name: '',
  emoji: '🎉',
  description: '',
  startLocal: easternNowInputValue(),
  durationDays: '3',
  bonusDollars: '5',
  minDepositDollars: '10',
  maxDeposits: '5',
  minTier: VIP_TIERS[0].name,
});

export default function EventsPanel() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch('/api/admin/events')
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data?.events) ? data.events : []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const set = (field: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalBonusLabel = dollars(Math.round(Number(form.bonusDollars) * 100) * Number(form.maxDeposits) || 0);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not create the event.');
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the event.');
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: string, method: 'PATCH' | 'DELETE', confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch('/api/admin/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Something went wrong.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5 space-y-4">
        <h3 className="text-pearl-100 font-bold flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-gold-400" /> New event
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_5rem] gap-3">
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Event name</span>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Super Bowl Weekend" maxLength={60} required />
          </label>
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Emoji</span>
            <input className={inputClass} value={form.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={8} />
          </label>
        </div>

        <label className="block">
          <span className="text-pearl-300/70 text-xs block mb-1">Message customers see on the event tab (optional)</span>
          <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={300} />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Starts (Eastern time)</span>
            <input type="datetime-local" className={inputClass} value={form.startLocal} onChange={(e) => set('startLocal', e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Lasts how many days</span>
            <input type="number" min={1} max={90} step={1} className={inputClass} value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Bonus per qualifying deposit ($)</span>
            <input type="number" min={0.01} step={0.01} className={inputClass} value={form.bonusDollars} onChange={(e) => set('bonusDollars', e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Minimum deposit to qualify ($)</span>
            <input type="number" min={0.01} step={0.01} className={inputClass} value={form.minDepositDollars} onChange={(e) => set('minDepositDollars', e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">How many deposits earn the bonus</span>
            <input type="number" min={1} max={50} step={1} className={inputClass} value={form.maxDeposits} onChange={(e) => set('maxDeposits', e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-pearl-300/70 text-xs block mb-1">Who can join</span>
            <select className={inputClass} value={form.minTier} onChange={(e) => set('minTier', e.target.value)}>
              {TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-pearl-300/60 text-sm">
            Each customer can earn up to <span className="text-gold-400 font-semibold">{totalBonusLabel}</span>. The tab shows
            for the whole time the event runs.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-bold bg-gold-400 text-navy-900 hover:bg-gold-300 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create event'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>

      <div className="space-y-3">
        <h3 className="text-pearl-100 font-bold">Events</h3>
        {loading ? (
          <p className="text-pearl-300/50 text-sm">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">No events yet. Create one above.</p>
        ) : (
          events.map((event) => {
            const status = statusOf(event);
            const tierLabel = TIER_OPTIONS.find((option) => option.value === event.minTier)?.label ?? event.minTier;
            return (
              <div key={event.id} className="rounded-xl border border-white/10 bg-navy-800/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-pearl-100 font-semibold">
                    {event.emoji} {event.name}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        status === 'running'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : status === 'upcoming'
                          ? 'bg-gold-500/20 text-gold-400'
                          : 'bg-white/10 text-pearl-300/60'
                      }`}
                    >
                      {status}
                    </span>
                  </p>
                  <p className="text-pearl-300/60 text-sm">
                    {formatEastern(event.startsAt)} → {formatEastern(event.endsAt)} ET · {tierLabel}
                  </p>
                  <p className="text-pearl-300/60 text-sm">
                    {dollars(event.bonusPerDepositCents)} per deposit of {dollars(event.minDepositCents)}+ · up to {event.maxDeposits} deposits (
                    {dollars(event.bonusPerDepositCents * event.maxDeposits)} max)
                  </p>
                </div>
                {status === 'running' && (
                  <button
                    type="button"
                    disabled={busyId === event.id}
                    onClick={() => act(event.id, 'PATCH', `End "${event.name}" now? Customers keep what they've earned so far.`)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300/80 border border-gold-600/25 hover:text-pearl-100 disabled:opacity-60"
                  >
                    <X className="w-4 h-4" /> End now
                  </button>
                )}
                {status === 'upcoming' && (
                  <button
                    type="button"
                    disabled={busyId === event.id}
                    onClick={() => act(event.id, 'DELETE', `Delete "${event.name}"? It hasn't started yet.`)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-navy-900/60 text-red-300 border border-red-500/30 hover:text-red-200 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
