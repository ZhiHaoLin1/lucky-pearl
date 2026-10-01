import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { isValidBirthday } from '@/lib/bonuses';

// Saves the signed-in customer's birthday. It can only be set once, so the
// birthday bonus can't be moved to whatever day a customer wants it.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
  }
  if (user.birthday) {
    return NextResponse.json(
      { error: 'Your birthday is already saved. Message us if it needs to be changed.' },
      { status: 409 }
    );
  }

  try {
    const body = (await request.json()) as { month?: string | number; day?: string | number };
    const month = Number(body.month);
    const day = Number(body.day);
    if (!isValidBirthday(month, day)) {
      return NextResponse.json({ error: 'Enter a valid birthday.' }, { status: 400 });
    }

    await ensureSchema();
    await db.execute({
      sql: `UPDATE users SET birthday = ?, birthday_set_at = datetime('now') WHERE id = ? AND birthday IS NULL`,
      args: [`${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, user.id],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save your birthday.' }, { status: 500 });
  }
}
