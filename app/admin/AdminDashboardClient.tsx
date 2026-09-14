'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, Send } from 'lucide-react';

export type AdminCustomer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredGame: string | null;
  createdAt: string;
};

type AdminMessage = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default function AdminDashboardClient({ customers }: { customers: AdminCustomer[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(customers[0]?.id ?? null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setMessagesLoading(true);
    fetch(`/api/admin/messages?userId=${encodeURIComponent(selectedId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !messageBody.trim()) return;
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedId, body: messageBody.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not send the message.');
      }
      const sqliteNow = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, body: messageBody.trim(), created_at: sqliteNow, read_at: null },
      ]);
      setMessageBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message.');
    } finally {
      setIsSending(false);
    }
  };

  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-8 text-center text-pearl-300/70">
        No customer accounts yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 rounded-2xl border border-gold-600/25 bg-navy-800/60 overflow-hidden">
        <div className="max-h-[560px] overflow-y-auto divide-y divide-white/5">
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => setSelectedId(customer.id)}
              className={`w-full text-left px-5 py-4 transition-colors ${
                selectedId === customer.id ? 'bg-gold-500/10' : 'hover:bg-white/5'
              }`}
            >
              <p className="text-pearl-100 font-semibold text-sm truncate">{customer.fullName}</p>
              <p className="text-pearl-300/60 text-xs truncate">{customer.email}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6 flex flex-col">
        {!selectedCustomer ? (
          <p className="text-pearl-300/70 text-sm">Select a customer to view details.</p>
        ) : (
          <>
            <div className="mb-5 pb-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white mb-3">{selectedCustomer.fullName}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center gap-2 text-pearl-300/80">
                  <Mail className="w-4 h-4 text-gold-400" />
                  {selectedCustomer.email}
                </span>
                <span className="flex items-center gap-2 text-pearl-300/80">
                  <Phone className="w-4 h-4 text-gold-400" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.preferredGame && (
                  <span className="text-pearl-300/60">Favorite: {selectedCustomer.preferredGame}</span>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto space-y-3 mb-5">
              {messagesLoading ? (
                <p className="text-pearl-300/50 text-sm">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-pearl-300/50 text-sm">No messages sent to this customer yet.</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3">
                    <p className="text-pearl-100 text-sm whitespace-pre-wrap">{message.body}</p>
                    <p className="text-pearl-300/40 text-xs mt-1.5">
                      {new Date(message.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-US')}
                      {message.read_at ? ' · Read' : ' · Unread'}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSend} className="flex gap-3">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Write a message…"
                rows={2}
                required
                className="flex-1 rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
              />
              <button
                type="submit"
                disabled={isSending}
                className="shrink-0 px-5 rounded-xl bg-gold-gradient text-navy-900 font-bold flex items-center gap-2 disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-pearl-100">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
