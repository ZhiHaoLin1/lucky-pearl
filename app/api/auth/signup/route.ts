import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';
import { claimGuestMessages } from '@/lib/chat';
import { recordAccountSignals, clientIp, DEVICE_COOKIE, isValidDeviceId } from '@/lib/accountSignals';
import { cookies } from 'next/headers';
import {
  createReferralRecord,
  evaluateReferralSignup,
  getActiveLink,
  normalizeReferralCode,
  rememberIdentity,
  type Verdict,
} from '@/lib/referrals';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { isValidBirthday } from '@/lib/bonuses';

type SignupPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  preferredGame?: string;
  password?: string;
  birthMonth?: string | number;
  birthDay?: string | number;
  refCode?: string;
  adultConfirmed?: boolean;
  turnstileToken?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    await ensureSchema();

    const body = (await request.json()) as SignupPayload;
    const fullName = body.fullName?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const phone = body.phone?.trim() ?? '';
    const preferredGame = body.preferredGame?.trim() ?? '';
    const password = body.password ?? '';

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Full name, email, phone, and password are required.' },
        { status: 400 }
      );
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // Birthday is optional, but if one part is given it has to be a real date.
    let birthday: string | null = null;
    if (body.birthMonth || body.birthDay) {
      const month = Number(body.birthMonth);
      const day = Number(body.birthDay);
      if (!isValidBirthday(month, day)) {
        return NextResponse.json({ error: 'Enter a valid birthday.' }, { status: 400 });
      }
      birthday = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    if (process.env.TURNSTILE_SECRET_KEY) {
      const remoteIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
      const captchaOk = await verifyTurnstileToken(body.turnstileToken ?? '', remoteIp);
      if (!captchaOk) {
        return NextResponse.json(
          { error: 'Verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 }
      );
    }

    // Referral: decided BEFORE the account exists, so the new account can't match itself.
    const refCode = normalizeReferralCode(body.refCode);
    const referralLink = refCode ? await getActiveLink(refCode) : null;
    const adultConfirmed = body.adultConfirmed === true;
    let referralVerdict: Verdict | null = null;
    if (referralLink) {
      const deviceCookie = cookies().get(DEVICE_COOKIE)?.value;
      referralVerdict = await evaluateReferralSignup({
        referrerUserId: referralLink.referrerUserId,
        fullName,
        email,
        phone,
        adultConfirmed,
        deviceId: isValidDeviceId(deviceCookie) ? deviceCookie : null,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent'),
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO users (id, full_name, email, phone, preferred_game, password_hash, birthday, birthday_set_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ${birthday ? "datetime('now')" : 'NULL'})`,
      args: [id, fullName, email, phone, preferredGame || null, passwordHash, birthday],
    });

    await rememberIdentity(id);
    if (referralLink && referralVerdict) {
      await createReferralRecord({ refereeUserId: id, link: referralLink, adultConfirmed, verdict: referralVerdict });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [
            'New Lucky Pearl account created',
            `Name: ${fullName}`,
            `Email: ${email}`,
            `Phone: ${phone}`,
            `Preferred game: ${preferredGame || 'Not provided'}`,
            ...(referralLink && referralVerdict
              ? [`Referral: invited by ${referralLink.referrerFirstName} (${referralVerdict.eligibility}${referralVerdict.reason ? ': ' + referralVerdict.reason : ''})`]
              : []),
          ].join('\n'),
        }),
      }).catch(() => {});
    }

    const response = NextResponse.json({ ok: true, fullName });
    await attachSessionCookie(response, id);
    await claimGuestMessages(response, id);
    await recordAccountSignals(request, response, id);
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while creating your account.' },
      { status: 500 }
    );
  }
}
