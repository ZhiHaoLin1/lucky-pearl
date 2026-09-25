import { NextResponse } from 'next/server';
import { getAccessToken, listCandidateMessageIds, getMessage } from '@/lib/gmailPolling';
import { processDepositEmail } from '@/lib/emailDepositProcessor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    // Not configured yet — succeed quietly rather than failing the cron
    // run every 5 minutes until Gmail OAuth setup is finished.
    return NextResponse.json({ ok: true, skipped: 'not_configured' });
  }

  const accessToken = await getAccessToken();
  const messageIds = await listCandidateMessageIds(accessToken);

  // Nothing in this loop writes back to Gmail — see lib/gmailPolling.ts for
  // why (a separate, independent poller also reads this inbox). Every
  // matching message gets re-fetched every poll; our own database
  // (email_message_id) is what keeps that from double-processing anything.
  const results: Array<{ id: string; status: string }> = [];
  for (const id of messageIds) {
    const { from, subject, text } = await getMessage(accessToken, id);
    const result = await processDepositEmail({ from, subject, text, providerMessageId: id });
    results.push({ id, status: result.status });
  }

  return NextResponse.json({ ok: true, checked: messageIds.length, results });
}
