import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { formatCents } from '@/lib/vip';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  const result = await db.execute(`
    SELECT w.id, w.amount_cents, w.method, w.payout_detail, w.fee_cents, w.created_at,
           u.full_name, u.email
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    WHERE w.status = 'pending'
    ORDER BY w.created_at ASC
  `);

  if (result.rows.length === 0) {
    return NextResponse.json({ ok: true, pending: 0 });
  }

  const webhookUrl = process.env.DISCORD_WITHDRAWAL_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    const now = Date.now();
    const lines = result.rows.map((row, index) => {
      const amountCents = Number(row.amount_cents);
      const feeCents = Number(row.fee_cents ?? 0);
      const netCents = amountCents - feeCents;
      const methodLabel = row.method === 'cashapp' ? 'Cash App' : row.method === 'zelle' ? 'Zelle' : String(row.method ?? 'unknown');
      const feeNote = feeCents > 0 ? `, net ${formatCents(netCents)} after fee` : '';
      const createdAtMs = new Date(String(row.created_at).replace(' ', 'T') + 'Z').getTime();
      const minutesAgo = Math.max(0, Math.round((now - createdAtMs) / 60000));
      return `${index + 1}. ${row.full_name} — ${formatCents(amountCents)} via ${methodLabel} to ${row.payout_detail}${feeNote} (pending ${minutesAgo} min)`;
    });

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [
          `⏰ **${result.rows.length} pending withdrawal request${result.rows.length === 1 ? '' : 's'}**`,
          ...lines,
          '',
          'Mark them Completed or Denied: https://www.luckypearl.app/admin',
        ].join('\n'),
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, pending: result.rows.length });
}
