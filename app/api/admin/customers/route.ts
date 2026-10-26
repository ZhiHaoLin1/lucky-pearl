import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { rememberIdentity } from '@/lib/referrals';
import { normalizeEmail, normalizePhone } from '@/lib/accountSignals';
import { isValidBirthday } from '@/lib/bonuses';
import { VIP_TIERS } from '@/lib/vip';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates a customer account on someone's behalf (people who sign up by text, phone or in person).
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const username = String(body.username ?? '').trim();
    const preferredGame = String(body.preferredGame ?? '').trim();
    const password = String(body.password ?? '');
    const tierOverride = String(body.tierOverride ?? '');
    const force = body.force === true;

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: 'Name, email, phone and password are required.' }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (tierOverride && !VIP_TIERS.some((tier) => tier.name === tierOverride)) {
      return NextResponse.json({ error: 'Unknown VIP tier.' }, { status: 400 });
    }

    let birthday: string | null = null;
    if (body.birthMonth || body.birthDay) {
      const month = Number(body.birthMonth);
      const day = Number(body.birthDay);
      if (!isValidBirthday(month, day)) {
        return NextResponse.json({ error: 'Enter a valid birthday.' }, { status: 400 });
      }
      birthday = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    await ensureSchema();

    // Same rules as a normal signup: an email can only be used once, and so can a username.
    const emailTaken = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (emailTaken.rows.length > 0) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
    }
    if (username) {
      const usernameTaken = await db.execute({ sql: 'SELECT id FROM users WHERE username = ? COLLATE NOCASE', args: [username] });
      if (usernameTaken.rows.length > 0) {
        return NextResponse.json({ error: 'Another customer already has that username.' }, { status: 409 });
      }
    }

    // Warn (but allow) when this looks like someone who already has an account.
    if (!force) {
      const wantedPhone = normalizePhone(phone);
      const wantedEmail = normalizeEmail(email);
      const existing = await db.execute("SELECT id, full_name, email, phone FROM users WHERE role != 'admin'");
      const duplicates = existing.rows
        .map((row) => {
          const samePhone = Boolean(wantedPhone) && normalizePhone(String(row.phone)) === wantedPhone;
          const sameEmail = normalizeEmail(String(row.email)) === wantedEmail;
          const why = samePhone && sameEmail ? 'same phone and email' : samePhone ? 'same phone number' : sameEmail ? 'same email (ignoring dots and +tags)' : '';
          return why ? { id: String(row.id), fullName: String(row.full_name), email: String(row.email), phone: String(row.phone), why } : null;
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      if (duplicates.length > 0) {
        return NextResponse.json({ error: 'This looks like someone who already has an account.', duplicates }, { status: 409 });
      }
    }

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO users (id, full_name, email, phone, preferred_game, password_hash, username, tier_override, birthday, birthday_set_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${birthday ? "datetime('now')" : 'NULL'})`,
      args: [id, fullName, email, phone, preferredGame || null, await bcrypt.hash(password, 10), username || null, tierOverride || null, birthday],
    });
    await rememberIdentity(id);

    return NextResponse.json({
      ok: true,
      customer: {
        id,
        fullName,
        username: username || null,
        email,
        phone,
        preferredGame: preferredGame || null,
        createdAt: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ''),
        unreadCount: 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unexpected error while creating the account.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const username = String(body.username ?? '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
    }

    await ensureSchema();

    if (username) {
      const existing = await db.execute({
        sql: "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?",
        args: [username, userId],
      });
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Another customer already has that username.' },
          { status: 409 }
        );
      }
    }

    await db.execute({
      sql: 'UPDATE users SET username = ? WHERE id = ?',
      args: [username || null, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while updating the username.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.userIds)
      ? body.userIds.map((id: unknown) => String(id)).filter(Boolean)
      : typeof body.userId === 'string' && body.userId
      ? [body.userId]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No accounts specified.' }, { status: 400 });
    }

    await ensureSchema();

    // Remember who they were, so a deleted account can't come back as a "new" referral.
    for (const id of ids) await rememberIdentity(id);

    const statements = ids.flatMap((id) => [
      { sql: 'DELETE FROM messages WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM password_resets WHERE user_id = ?', args: [id] },
      { sql: "DELETE FROM users WHERE id = ? AND role != 'admin'", args: [id] },
    ]);
    await db.batch(statements, 'write');

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while deleting accounts.' },
      { status: 500 }
    );
  }
}
