import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import {
  MAX_CHAT_MESSAGE_LENGTH,
  allowChatMessage,
  resolveChatIdentity,
  saveCustomerMessage,
  setGuestCookie,
} from '@/lib/chat';
import { getFinanceSummary } from '@/lib/finance';
import { formatCents } from '@/lib/vip';
import { postCustomerMessageToDiscord } from '@/lib/discordChat';

// Works for logged-in customers and for guests (identified by a cookie), so the
// site-wide chat bubble can be used before anyone signs up.
export async function GET(request: Request) {
  await ensureSchema();
  const { identity } = await resolveChatIdentity(false);
  if (!identity) {
    return NextResponse.json({ messages: [] });
  }

  // The chat bubble polls with ?peek=1 while closed so its unread badge works;
  // only a real open of the inbox/chat marks support replies as read.
  const peek = new URL(request.url).searchParams.get('peek') === '1';
  if (!peek) {
    await db.execute({
      sql: "UPDATE messages SET read_at = datetime('now') WHERE user_id = ? AND sender_admin_id IS NOT NULL AND read_at IS NULL",
      args: [identity.conversationId],
    });
  }

  const result = await db.execute({
    sql: 'SELECT id, body, sender_admin_id, created_at, read_at FROM messages WHERE user_id = ? ORDER BY created_at ASC',
    args: [identity.conversationId],
  });

  return NextResponse.json({ messages: result.rows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = String(body.body ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }
    if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Messages can be up to ${MAX_CHAT_MESSAGE_LENGTH} characters. Please shorten it.` },
        { status: 400 }
      );
    }

    await ensureSchema();
    const { identity, newGuestToken } = await resolveChatIdentity(true);
    if (!identity) {
      return NextResponse.json({ error: 'Could not start the chat.' }, { status: 500 });
    }

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
    if (!(await allowChatMessage(identity.conversationId, ip))) {
      return NextResponse.json({ error: "You're sending messages too fast. Please wait a moment." }, { status: 429 });
    }

    await saveCustomerMessage(identity.conversationId, text);

    const { user } = identity;
    let label: string;
    let details: string;
    if (user) {
      label = user.fullName;
      try {
        const finance = await getFinanceSummary(user.id);
        details = `${finance.tier.name} member · lifetime deposits ${formatCents(finance.lifetimeDepositsCents)} · ${user.email}`;
      } catch {
        details = user.email;
      }
    } else {
      label = `Guest …${identity.conversationId.slice(-4)}`;
      details = 'Not logged in. They can only see your reply while this browser is open.';
    }

    // Prefer the Discord bot (Reply button); fall back to the old plain webhook alert.
    const posted = await postCustomerMessageToDiscord({ conversationId: identity.conversationId, label, details, text });
    if (!posted) {
      const webhookUrl = process.env.DISCORD_INBOX_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allowed_mentions: { parse: [] },
            content: [
              '📨 New inbox message from a customer',
              `Name: ${label}`,
              details,
              `Message: ${text}`,
              '',
              'Reply: https://www.luckypearl.app/admin',
            ].join('\n'),
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }
    }

    const response = NextResponse.json({ ok: true });
    if (newGuestToken) setGuestCookie(response, newGuestToken);
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while sending the message.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing message id.' }, { status: 400 });
  }

  await ensureSchema();
  await db.execute({
    sql: 'DELETE FROM messages WHERE id = ? AND user_id = ?',
    args: [id, sessionUser.id],
  });

  return NextResponse.json({ ok: true });
}
