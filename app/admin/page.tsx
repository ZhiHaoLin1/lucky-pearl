import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gem } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { db, ensureSchema } from '@/lib/db';
import LogoutButton from '@/app/dashboard/LogoutButton';
import AdminDashboardClient, { type AdminCustomer } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/');
  }
  if (sessionUser.role !== 'admin') {
    redirect('/dashboard');
  }

  await ensureSchema();
  const result = await db.execute(`
    SELECT
      u.id, u.full_name, u.username, u.email, u.phone, u.preferred_game, u.created_at,
      (
        SELECT COUNT(*) FROM messages m
        WHERE m.user_id = u.id AND m.sender_admin_id IS NULL AND m.read_at IS NULL
      ) AS unread_count
    FROM users u
    WHERE u.role != 'admin'
    ORDER BY u.created_at DESC
  `);

  const customers: AdminCustomer[] = result.rows.map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name),
    username: row.username ? String(row.username) : null,
    email: String(row.email),
    phone: String(row.phone),
    preferredGame: row.preferred_game ? String(row.preferred_game) : null,
    createdAt: String(row.created_at),
    unreadCount: Number(row.unread_count),
  }));

  const squareQueueResult = await db.execute(
    "SELECT COUNT(*) AS c FROM square_unmatched_payments WHERE resolved_at IS NULL"
  );
  const squareQueueCount = Number(squareQueueResult.rows[0]?.c ?? 0);

  const emailQueueResult = await db.execute(
    "SELECT COUNT(*) AS c FROM email_unmatched_payments WHERE resolved_at IS NULL"
  );
  const emailQueueCount = Number(emailQueueResult.rows[0]?.c ?? 0);

  return (
    <main
      className="min-h-screen pb-20"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #111f38 0%, #070c1a 40%, #04060f 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        <div className="flex items-center justify-between gap-4 mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-navy-900" />
            </div>
            <span className="text-gold-shimmer text-lg sm:text-xl font-bold">Lucky Pearl Admin</span>
          </Link>
          <LogoutButton />
        </div>

        <div className="mb-8">
          <p
            className="text-gold-600 text-xs tracking-[0.5em] uppercase mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Admin
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold text-gold-shimmer mb-2"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Customer accounts
          </h1>
        </div>

        <AdminDashboardClient
          customers={customers}
          initialSquareQueueCount={squareQueueCount}
          initialEmailQueueCount={emailQueueCount}
        />
      </div>
    </main>
  );
}
