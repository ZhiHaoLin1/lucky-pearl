import { NextResponse } from 'next/server';
import { getAccessToken, listCandidateMessageIds, getMessage, markAsRead } from '@/lib/gmailPolling';
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

  const results: Array<{ id: string; status: string }> = [];
  for (const id of messageIds) {
    const { from, subject, text } = await getMessage(accessToken, id);
    const result = await processDepositEmail({ from, subject, text });
    // Mark read regardless of outcome — our own email_message_id dedup is
    // the real safety net, this just keeps the inbox (and next poll) tidy.
    await markAsRead(accessToken, id);
    results.push({ id, status: result.status });
  }

  return NextResponse.json({ ok: true, checked: messageIds.length, results });
}
