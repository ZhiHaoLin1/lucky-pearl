import { NextResponse } from 'next/server';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';
import { db, ensureSchema } from '@/lib/db';
import { formatCents } from '@/lib/vip';

type DiscordOption = { name: string; value: string; focused?: boolean };
type DiscordInteraction = {
  type: number;
  data?: { name?: string; options?: DiscordOption[] };
};

function methodLabelFor(method: unknown): string {
  return method === 'cashapp' ? 'Cash App' : method === 'zelle' ? 'Zelle' : String(method ?? 'unknown');
}

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
        const name = `${row.full_name} — ${formatCents(Number(row.amount_cents))} via ${methodLabelFor(row.method)}`;
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
        content: `✅ Marked **${formatCents(Number(row.amount_cents))}** to **${row.full_name}** (${methodLabelFor(
          row.method
        )} → ${row.payout_detail}) as completed.`,
      },
    });
  }

  return NextResponse.json({ error: 'Unknown interaction.' }, { status: 400 });
}
