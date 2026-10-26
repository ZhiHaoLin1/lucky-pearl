import { NextResponse } from 'next/server';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';
import { db, ensureSchema } from '@/lib/db';
import { formatCents } from '@/lib/vip';
import { methodLabel } from '@/lib/withdrawalMethods';
import { saveSupportReply, MAX_CHAT_MESSAGE_LENGTH } from '@/lib/chat';
import { REPLY_BUTTON_PREFIX, REPLY_MODAL_PREFIX, conversationLabel } from '@/lib/discordChat';

type DiscordOption = { name: string; value: string; focused?: boolean };
type DiscordInteraction = {
  type: number;
  data?: {
    name?: string;
    options?: DiscordOption[];
    custom_id?: string;
    components?: Array<{ components?: Array<{ custom_id?: string; value?: string }> }>;
  };
  member?: { user?: { id?: string; username?: string } };
  user?: { id?: string; username?: string };
};

const ephemeral = (content: string) =>
  NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const rawBody = await request.text();

  if (!publicKey || !signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 401 });
  }

  const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid request signature.' }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as DiscordInteraction;

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  await ensureSchema();

  if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    const focusedOption = interaction.data?.options?.find((opt) => opt.focused);
    const query = String(focusedOption?.value ?? '').toLowerCase();

    const result = await db.execute(`
      SELECT w.id, w.amount_cents, w.method, u.full_name
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      WHERE w.status = 'pending'
      ORDER BY w.created_at ASC
      LIMIT 25
    `);

    const choices = result.rows
      .map((row) => {
        const name = `${row.full_name} — ${formatCents(Number(row.amount_cents))} via ${methodLabel(row.method)}`;
        return { name: name.slice(0, 100), value: String(row.id) };
      })
      .filter((choice) => choice.name.toLowerCase().includes(query))
      .slice(0, 25);

    return NextResponse.json({
      type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
      data: { choices },
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === 'fulfilled') {
    const withdrawalId = interaction.data.options?.find((opt) => opt.name === 'request')?.value;
    if (!withdrawalId) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: '⚠️ No request selected.' },
      });
    }

    const result = await db.execute({
      sql: `SELECT w.amount_cents, w.method, w.payout_detail, w.status, u.full_name
            FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.id = ?`,
      args: [withdrawalId],
    });
    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: '⚠️ That withdrawal request was not found — it may have already been handled.' },
      });
    }
    if (row.status !== 'pending') {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `That request is already marked **${row.status}**.` },
      });
    }

    await db.execute({
      sql: "UPDATE withdrawals SET status = 'completed', processed_at = datetime('now') WHERE id = ?",
      args: [withdrawalId],
    });

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `✅ Marked **${formatCents(Number(row.amount_cents))}** to **${row.full_name}** (${methodLabel(
          row.method
        )} → ${row.payout_detail}) as completed.`,
      },
    });
  }

  // Customer chat: staff press "Reply" on a customer's message, type in the popup,
  // and the reply shows up in that customer's chat bubble.
  if (interaction.type === InteractionType.MESSAGE_COMPONENT && interaction.data?.custom_id?.startsWith(REPLY_BUTTON_PREFIX)) {
    const conversationId = interaction.data.custom_id.slice(REPLY_BUTTON_PREFIX.length);
    const label = await conversationLabel(conversationId);
    return NextResponse.json({
      type: 9, // MODAL
      data: {
        custom_id: REPLY_MODAL_PREFIX + conversationId,
        title: `Reply to ${label}`.slice(0, 45),
        components: [
          {
            type: 1,
            components: [
              {
                type: 4, // text input
                custom_id: 'reply_text',
                label: 'Your reply',
                style: 2, // paragraph
                min_length: 1,
                max_length: MAX_CHAT_MESSAGE_LENGTH,
                required: true,
              },
            ],
          },
        ],
      },
    });
  }

  if (interaction.type === InteractionType.MODAL_SUBMIT && interaction.data?.custom_id?.startsWith(REPLY_MODAL_PREFIX)) {
    const conversationId = interaction.data.custom_id.slice(REPLY_MODAL_PREFIX.length);
    const text = String(interaction.data.components?.[0]?.components?.[0]?.value ?? '').trim();
    const staff = interaction.member?.user ?? interaction.user;
    if (!text || !staff?.id) {
      return ephemeral('⚠️ Nothing to send.');
    }

    const label = await conversationLabel(conversationId);
    await saveSupportReply(conversationId, staff.id, text.slice(0, MAX_CHAT_MESSAGE_LENGTH));
    // Public (not ephemeral) so the rest of the team can see it was answered.
    return NextResponse.json({
      type: 4,
      data: {
        content: `↩️ **${staff.username ?? 'Staff'}** replied to **${label}**:\n> ${text.slice(0, 500).replace(/\n/g, '\n> ')}`,
        allowed_mentions: { parse: [] },
      },
    });
  }

  return NextResponse.json({ error: 'Unknown interaction.' }, { status: 400 });
}
