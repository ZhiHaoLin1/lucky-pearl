'use client';

import { useState } from 'react';
import { Inbox, Send, Trash2 } from 'lucide-react';

export type InboxMessage = {
  id: string;
  body: string;
  senderAdminId: string | null;
  createdAt: string;
  wasUnread: boolean;
};

function formatSqliteDate(value: string) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString('en-US');
}

export default function InboxClient({ initialMessages }: { initialMessages: InboxMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = initialMessages.filter((message) => message.wasUnread).length;

  const refresh = async () => {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      if (Array.isArray(data?.messages)) {
        setMessages(
          data.messages.map((row: { id: string; body: string; sender_admin_id: string | null; created_at: string }) => ({
            id: row.id,
            body: row.body,
            senderAdminId: row.sender_admin_id,
            createdAt: row.created_at,
            wasUnread: false,
          }))
        );
      }
    } catch {
      // Keep current state if refresh fails.
    }
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageBody.trim()) return;
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageBody.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not send your message.');
      }
      setMessageBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
    try {
      await fetch(`/api/messages?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      refresh();
    }
  };

  return (
    <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6 mb-12">
      <div className="flex items-center gap-2 mb-5">
        <Inbox className="w-5 h-5 text-gold-400" />
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
          Inbox
        </h2>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400">
            {unreadCount} new
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="text-pearl-300/60 text-sm mb-5">No messages yet.</p>
      ) : (
        <div className="space-y-3 mb-5 max-h-[360px] overflow-y-auto">
          {messages.map((message) => {
            const fromSupport = Boolean(message.senderAdminId);
            return (
              <div
                key={message.id}
                className={`group rounded-xl border px-4 py-3.5 flex items-start justify-between gap-3 ${
                  message.wasUnread
                    ? 'border-gold-500/40 bg-gold-500/5'
                    : fromSupport
                    ? 'border-white/10 bg-navy-900/60'
                    : 'border-white/10 bg-navy-900/60 ml-8'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-pearl-300/50 text-[10px] uppercase tracking-wider mb-1">
                    {fromSupport ? 'Lucky Pearl Support' : 'You'}
                  </p>
                  <p className="text-pearl-100 text-sm whitespace-pre-wrap">{message.body}</p>
                  <p className="text-pearl-300/40 text-xs mt-1.5">{formatSqliteDate(message.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(message.id)}
                  className="shrink-0 text-pearl-300/40 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-3">
        <textarea
          value={messageBody}
          onChange={(event) => setMessageBody(event.target.value)}
          placeholder="Message our team…"
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
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
