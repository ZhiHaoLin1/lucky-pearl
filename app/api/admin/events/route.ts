import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { easternLocalToUtc, toSqliteDateTime } from '@/lib/easternDay';
import { listEvents } from '@/lib/events';
import { VIP_TIERS } from '@/lib/vip';

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireAdmin() {
  const sessionUser = await getSessionUser();
  return sessionUser && sessionUser.role === 'admin' ? sessionUser : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  await ensureSchema();
  return NextResponse.json({ events: await listEvents() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const emoji = String(body.emoji ?? '').trim() || '🎉';
    const description = String(body.description ?? '').trim();
    const startsAt = easternLocalToUtc(String(body.startLocal ?? ''));
    const durationDays = Number(body.durationDays);
    const bonusCents = Math.round(Number(body.bonusDollars) * 100);
    const minDepositCents = Math.round(Number(body.minDepositDollars) * 100);
    const maxDeposits = Number(body.maxDeposits);
    const minTier = String(body.minTier ?? '');

    if (!name || name.length > 60) {
      return NextResponse.json({ error: 'Give the event a name (up to 60 characters).' }, { status: 400 });
    }
    if (emoji.length > 8) {
      return NextResponse.json({ error: 'Use a single emoji.' }, { status: 400 });
    }
    if (description.length > 300) {
      return NextResponse.json({ error: 'Keep the description under 300 characters.' }, { status: 400 });
    }
    if (!startsAt) {
      return NextResponse.json({ error: 'Pick a valid start date and time.' }, { status: 400 });
    }
    if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 90) {
      return NextResponse.json({ error: 'Duration must be between 1 and 90 days.' }, { status: 400 });
    }
    if (!Number.isFinite(bonusCents) || bonusCents < 1 || bonusCents > 100_000) {
      return NextResponse.json({ error: 'Bonus per deposit must be between $0.01 and $1,000.' }, { status: 400 });
    }
    if (!Number.isFinite(minDepositCents) || minDepositCents < 1 || minDepositCents > 1_000_000) {
      return NextResponse.json({ error: 'Enter a valid minimum deposit.' }, { status: 400 });
    }
    if (!Number.isInteger(maxDeposits) || maxDeposits < 1 || maxDeposits > 50) {
      return NextResponse.json({ error: 'Max qualifying deposits must be a whole number from 1 to 50.' }, { status: 400 });
    }
    if (!VIP_TIERS.some((tier) => tier.name === minTier)) {
      return NextResponse.json({ error: 'Pick which tier can join.' }, { status: 400 });
    }

    const endsAt = new Date(startsAt.getTime() + Math.round(durationDays) * DAY_MS);

    await ensureSchema();
    await db.execute({
      sql: `INSERT INTO events
              (id, name, emoji, description, starts_at, ends_at, bonus_per_deposit_cents, min_deposit_cents, max_deposits, min_tier, created_by_admin_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        name,
        emoji,
        description || null,
        toSqliteDateTime(startsAt),
        toSqliteDateTime(endsAt),
        bonusCents,
        minDepositCents,
        maxDeposits,
        minTier,
        admin.id,
      ],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not create the event.' }, { status: 500 });
  }
}

// "End now": closes a running event immediately. Deposits made so far still count
// toward what customers earned, and the Bonuses tab keeps listing it for a while.
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    await ensureSchema();
    const now = toSqliteDateTime(new Date());
    const result = await db.execute({
      sql: 'UPDATE events SET ends_at = ? WHERE id = ? AND starts_at <= ? AND ends_at > ?',
      args: [now, id, now, now],
    });
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'That event is not running.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not end the event.' }, { status: 500 });
  }
}

// Only events that haven't started yet can be deleted; running or finished events
// are kept so customers' earned bonuses stay on record.
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    await ensureSchema();
    const result = await db.execute({
      sql: 'DELETE FROM events WHERE id = ? AND starts_at > ?',
      args: [id, toSqliteDateTime(new Date())],
    });
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Only events that have not started can be deleted.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not delete the event.' }, { status: 500 });
  }
}
