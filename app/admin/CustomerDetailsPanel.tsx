'use client';

import { useEffect, useState } from 'react';
import { methodLabel } from '@/lib/withdrawalMethods';
import type { CustomerDetails } from '@/lib/customerDetails';

const dollars = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const sqliteDate = (value: string | null) =>
  value
    ? new Date(value.replace(' ', 'T') + 'Z').toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

// Local copy: lib/bonuses pulls in the database client, which must not be bundled for the browser.
function formatBirthday(birthday: string) {
  const [month, day] = birthday.split('-').map(Number);
  return new Date(Date.UTC(2000, month - 1, day)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' });
}

type AccountRef = { id: string; fullName: string };

function AccountLinks({ accounts, onOpen }: { accounts: AccountRef[]; onOpen: (id: string) => void }) {
  return (
    <>
      {accounts.map((account, index) => (
        <span key={account.id}>
          {index > 0 && ', '}
          <button type="button" onClick={() => onOpen(account.id)} className="underline underline-offset-2 text-gold-400 hover:text-gold-300">
            {account.fullName}
          </button>
        </span>
      ))}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-900/50 p-4">
      <h3 className="text-pearl-100 font-bold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

// Everything the site has recorded about one customer: when they were last seen, which
// devices and networks they used, and where their money comes from and goes to.
export default function CustomerDetailsPanel({
  customerId,
  onOpenCustomer,
}: {
  customerId: string;
  onOpenCustomer: (id: string) => void;
}) {
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/customer-details?userId=${encodeURIComponent(customerId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Could not load details.');
        if (!cancelled) setDetails(data.details);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) return <p className="text-pearl-300/50 text-sm">Loading details…</p>;
  if (error || !details) return <p className="text-red-400 text-sm">{error ?? 'No details found.'}</p>;

  const { basics, devices, payouts, payers, linked } = details;

  return (
    <div className="space-y-4">
      {linked.length > 0 && (
        <div className="space-y-2">
          {linked.map((group) => (
            <div
              key={group.groupKey}
              className={`rounded-xl border p-3 text-sm ${
                group.reviewed ? 'border-white/10 bg-navy-900/40 text-pearl-300/70' : 'border-amber-500/40 bg-amber-500/5 text-amber-200'
              }`}
            >
              <p className="font-semibold">
                {group.reviewed ? 'Linked accounts (marked fine)' : `⚠ ${group.strength === 'strong' ? 'Strong match' : 'Possible match'} with`}:{' '}
                <AccountLinks accounts={group.accounts} onOpen={onOpenCustomer} />
              </p>
              <p className="text-xs opacity-80 mt-1">{group.reasons.join(' · ')}</p>
            </div>
          ))}
        </div>
      )}

      <Section title="Account">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-pearl-300/50 text-xs">Joined</dt>
            <dd className="text-pearl-100">{sqliteDate(basics.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-pearl-300/50 text-xs">Last seen (login or signup)</dt>
            <dd className="text-pearl-100">{sqliteDate(basics.lastSeenAt)}</dd>
          </div>
          <div>
            <dt className="text-pearl-300/50 text-xs">Tier</dt>
            <dd className="text-pearl-100">
              {basics.tier} · {dollars(basics.lifetimeDepositsCents)} deposited
            </dd>
          </div>
          <div>
            <dt className="text-pearl-300/50 text-xs">Birthday</dt>
            <dd className="text-pearl-100">
              {basics.birthday ? `${formatBirthday(basics.birthday)} (saved ${sqliteDate(basics.birthdaySetAt)})` : 'Not saved'}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Devices and networks">
        {devices.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">
            Nothing recorded yet. Devices are saved when a customer logs in or signs up, so older accounts fill in after their next login.
          </p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={`${device.deviceShort}-${device.networkShort}`} className="rounded-lg bg-black/20 p-3 text-sm">
                <p className="text-pearl-100 font-semibold">
                  {device.browser} on {device.os}
                </p>
                <p className="text-pearl-300/60 text-xs">
                  Device …{device.deviceShort} · network …{device.networkShort} · seen {device.seenCount}× · first {sqliteDate(device.firstSeenAt)} ·
                  last {sqliteDate(device.lastSeenAt)}
                </p>
                {device.sameDevice.length > 0 && (
                  <p className="text-amber-300 text-xs mt-1.5">
                    Same device also used by: <AccountLinks accounts={device.sameDevice} onOpen={onOpenCustomer} />
                  </p>
                )}
                {device.sameNetwork.length > 0 && (
                  <p className="text-amber-200/80 text-xs mt-1">
                    Same network and browser as: <AccountLinks accounts={device.sameNetwork} onOpen={onOpenCustomer} />
                  </p>
                )}
              </div>
            ))}
            <p className="text-pearl-300/40 text-xs">IP addresses are stored only as scrambled codes, so you can compare networks but not see the address.</p>
          </div>
        )}
      </Section>

      <Section title="Cash-out destinations">
        {payouts.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">No withdrawals yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {payouts.map((payout) => (
              <li key={`${payout.method}|${payout.detail}`}>
                <span className="text-pearl-100">
                  {methodLabel(payout.method)} → {payout.detail}
                </span>
                <span className="text-pearl-300/50 text-xs"> · {payout.times}× · last {sqliteDate(payout.lastAt)}</span>
                {payout.sharedWith.length > 0 && (
                  <p className="text-amber-300 text-xs">
                    Also used by: <AccountLinks accounts={payout.sharedWith} onOpen={onOpenCustomer} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Who pays for this account">
        {payers.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">No payer names recorded yet. They're saved from Venmo and Zelle payment emails going forward.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {payers.map((payer) => (
              <li key={payer.name}>
                <span className="text-pearl-100">{payer.name}</span>
                <span className="text-pearl-300/50 text-xs"> · {payer.deposits} payment{payer.deposits === 1 ? '' : 's'}</span>
                {payer.sharedWith.length > 0 && (
                  <p className="text-amber-300 text-xs">
                    Also paid for: <AccountLinks accounts={payer.sharedWith} onOpen={onOpenCustomer} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
