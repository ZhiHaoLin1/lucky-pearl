import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { findDuplicateGroups, getOpenDuplicateGroups } from '@/lib/accountSignals';

async function requireAdmin() {
  const sessionUser = await getSessionUser();
  return sessionUser && sessionUser.role === 'admin' ? sessionUser : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    await ensureSchema();
    const { open } = await getOpenDuplicateGroups();
    return NextResponse.json({ groups: open });
  } catch (error) {
    console.error('duplicates failed', error);
    return NextResponse.json({ error: 'Could not load duplicates. Please try again.' }, { status: 500 });
  }
}

// "Looks fine": hides a group (e.g. a family sharing a phone). If another account later
// joins the group its key changes, so it comes back for another look.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const groupKey = String(body.groupKey ?? '');
    if (!groupKey) return NextResponse.json({ error: 'Missing groupKey.' }, { status: 400 });

    await ensureSchema();
    const groups = await findDuplicateGroups();
    if (!groups.some((group) => group.key === groupKey)) {
      return NextResponse.json({ error: 'That group has changed. Refresh and try again.' }, { status: 409 });
    }
    await db.execute({
      sql: 'INSERT OR REPLACE INTO duplicate_reviews (group_key, reviewed_by_admin_id) VALUES (?, ?)',
      args: [groupKey, admin.id],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
}
