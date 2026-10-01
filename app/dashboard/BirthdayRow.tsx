'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cake } from 'lucide-react';
import BirthdaySelect from '@/components/BirthdaySelect';

// Profile row for the birthday: shows it once saved, or lets the customer add
// it (one time only) so the birthday bonus tab can unlock next time it comes round.
export default function BirthdayRow({ birthdayLabel }: { birthdayLabel: string | null }) {
  const router = useRouter();
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!month || !day) {
      setError('Pick a month and a day.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/account/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, day }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not save your birthday.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your birthday.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <Cake className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Birthday</p>
        {birthdayLabel ? (
          <p className="text-pearl-100">{birthdayLabel}</p>
        ) : (
          <div className="mt-1.5 space-y-2">
            <p className="text-pearl-300/70 text-xs">
              Add your birthday to unlock your birthday bonus. You can only set it once.
            </p>
            <BirthdaySelect month={month} day={day} onChange={(next) => { setMonth(next.month); setDay(next.day); }} />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gold-400 text-navy-900 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save birthday'}
            </button>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
