import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { processDepositEmail } from '@/lib/emailDepositProcessor';

export const dynamic = 'force-dynamic';

/** Mailgun's classic inbound-route signing scheme: HMAC-SHA256(timestamp + token). */
function verifyMailgunSignature(timestamp: string, token: string, signature: string, signingKey: string): boolean {
  const expected = createHmac('sha256', signingKey).update(timestamp + token).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: Request) {
  const form = await request.formData();

  // Two ways to authorize, since different inbound-email providers support
  // different things. Mailgun signs routes (HMAC over timestamp+token) —
  // preferred when available, since it's cryptographically verifiable like
  // Square's webhook. SendGrid's Inbound Parse has no signing option at
  // all, so for that (or anything else without signing) we fall back to an
  // unguessable secret embedded in the destination URL.
  const mailgunSigningKey = process.env.MAILGUN_SIGNING_KEY;
  const timestamp = form.get('timestamp');
  const token = form.get('token');
  const signature = form.get('signature');

  let authorized = false;
  if (mailgunSigningKey && timestamp && token && signature) {
    authorized = verifyMailgunSignature(String(timestamp), String(token), String(signature), mailgunSigningKey);
  } else {
    const configuredSecret = process.env.EMAIL_WEBHOOK_SECRET;
    const { searchParams } = new URL(request.url);
    authorized = Boolean(configuredSecret) && searchParams.get('key') === configuredSecret;
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Field names differ by provider: SendGrid Inbound Parse uses from/subject/text;
  // Mailgun routes use from (or sender)/subject/body-plain (or stripped-text).
  const from = String(form.get('from') ?? form.get('sender') ?? '');
  const subject = String(form.get('subject') ?? '');
  const text = String(form.get('text') ?? form.get('body-plain') ?? form.get('stripped-text') ?? '');

  const result = await processDepositEmail({ from, subject, text });

  switch (result.status) {
    case 'ignored':
      return NextResponse.json({ ok: true, ignored: true });
    case 'duplicate':
      return NextResponse.json({ ok: true, duplicate: true });
    case 'queued':
      return NextResponse.json({ ok: true, matched: false });
    case 'matched':
      return NextResponse.json({ ok: true, matched: true, userId: result.userId });
  }
}
