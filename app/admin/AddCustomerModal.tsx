'use client';

import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import BirthdaySelect from '@/components/BirthdaySelect';
import { VIP_TIERS } from '@/lib/vip';
import type { AdminCustomer } from './AdminDashboardClient';

type PossibleDuplicate = { id: string; fullName: string; email: string; phone: string; why: string };

const inputClass =
  'w-full rounded-lg bg-navy-900 border border-gold-600/25 px-3 py-2.5 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30';

// Letters and digits that are hard to mix up (no 0/O, 1/l/I).
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generatePassword() {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join('');
}

const emptyForm = () => ({
  fullName: '',
  email: '',
  phone: '',
  username: '',
  preferredGame: '',
  password: generatePassword(),
  birthMonth: '',
  birthDay: '',
  tierOverride: '',
});

// Lets an admin create a customer account directly (for people who sign up by text, phone
// or in person). The password is shown once, to hand to the customer.
export default function AddCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: AdminCustomer) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<PossibleDuplicate[]>([]);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (field: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDuplicates([]);
  };

  const submit = async (force = false) => {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, force }),
      });
      const text = await response.text();
      let data: { error?: string; customer?: AdminCustomer; duplicates?: PossibleDuplicate[] } = {};
      try {
        data = JSON.parse(text);
      } catch {}
      if (response.status === 409 && data.duplicates?.length) {
        setDuplicates(data.duplicates);
        setError(data.error ?? 'This looks like an existing customer.');
        return;
      }
      if (!response.ok || !data.customer) throw new Error(data.error || 'Could not create the account.');
      onCreated(data.customer);
      setCreated({ email: data.customer.email, password: form.password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  };

  const copyLogin = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Lucky Pearl login\nEmail: ${created.email}\nPassword: ${created.password}\nhttps://www.luckypearl.app`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy the login details:', `Email: ${created.email}  Password: ${created.password}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-navy-900/80 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="add-customer-title">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-gold-600/30 bg-navy-800 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-4">
            <h2 id="add-customer-title" className="text-xl font-bold text-white">
              {created ? 'Account created' : 'Add a customer'}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-pearl-300 hover:text-gold-400 p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          {created ? (
            <div className="space-y-4">
              <p className="text-pearl-200 text-sm">Give these login details to the customer. The password is only shown now, so copy it before closing.</p>
              <div className="rounded-xl bg-black/30 p-4 text-sm space-y-1">
                <p>
                  <span className="text-pearl-300/60">Email: </span>
                  <span className="text-pearl-100 break-all">{created.email}</span>
                </p>
                <p>
                  <span className="text-pearl-300/60">Password: </span>
                  <span className="text-gold-400 font-mono text-base">{created.password}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyLogin} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-gold-400 text-navy-900">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy login details'}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300 border border-gold-600/25">
                  Done
                </button>
              </div>
              <p className="text-pearl-300/50 text-xs">They can change it any time with “Forgot password” on the login form.</p>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit(false);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-2">
                  <span className="text-pearl-300/70 text-xs block mb-1">Full name</span>
                  <input className={inputClass} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required autoFocus />
                </label>
                <label className="block">
                  <span className="text-pearl-300/70 text-xs block mb-1">Email</span>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} required />
                </label>
                <label className="block">
                  <span className="text-pearl-300/70 text-xs block mb-1">Phone</span>
                  <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
                </label>
                <label className="block">
                  <span className="text-pearl-300/70 text-xs block mb-1">Username (optional)</span>
                  <input className={inputClass} value={form.username} onChange={(e) => set('username', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-pearl-300/70 text-xs block mb-1">Favorite game (optional)</span>
                  <input className={inputClass} value={form.preferredGame} onChange={(e) => set('preferredGame', e.target.value)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-pearl-300/70 text-xs block mb-1">Password (at least 8 characters)</span>
                  <div className="flex gap-2">
                    <input className={`${inputClass} font-mono`} value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
                    <button type="button" onClick={() => set('password', generatePassword())} className="shrink-0 px-3 rounded-lg text-xs font-bold bg-navy-900/60 text-gold-400 border border-gold-600/25">
                      New one
                    </button>
                  </div>
                </label>
                <div className="block">
                  <span className="text-pearl-300/70 text-xs block mb-1">Birthday (optional, can’t be changed later)</span>
                  <BirthdaySelect month={form.birthMonth} day={form.birthDay} onChange={({ month, day }) => setForm((prev) => ({ ...prev, birthMonth: month, birthDay: day }))} />
                </div>
                <label className="block">
                  <span className="text-pearl-300/70 text-xs block mb-1">Starting VIP tier</span>
                  <select className={inputClass} value={form.tierOverride} onChange={(e) => set('tierOverride', e.target.value)}>
                    <option value="">Automatic (by deposits)</option>
                    {VIP_TIERS.map((tier) => (
                      <option key={tier.name} value={tier.name}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <p className="text-red-300 text-sm">{error}</p>}

              {duplicates.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm space-y-1.5">
                  {duplicates.map((dup) => (
                    <p key={dup.id} className="text-amber-100">
                      <span className="font-semibold">{dup.fullName}</span> ({dup.email}, {dup.phone}): {dup.why}
                    </p>
                  ))}
                  <button type="button" onClick={() => submit(true)} disabled={saving} className="mt-1 px-3 py-2 rounded-lg text-xs font-bold bg-amber-400 text-navy-900 disabled:opacity-60">
                    They are a different person, create anyway
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300 border border-gold-600/25">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-gold-400 text-navy-900 hover:bg-gold-300 disabled:opacity-60">
                  {saving ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
