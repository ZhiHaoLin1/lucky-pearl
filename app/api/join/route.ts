import { NextResponse } from 'next/server';

type JoinPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  preferredGame?: string;
};

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Server webhook is not configured.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as JoinPayload;
    const fullName = body.fullName?.trim() ?? '';
    const email = body.email?.trim() ?? '';
    const phone = body.phone?.trim() ?? '';
    const preferredGame = body.preferredGame?.trim() ?? '';

    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: 'Full name, email, and phone are required.' },
        { status: 400 }
      );
    }

    const discordPayload = {
      content: [
        'New Lucky Pearl Join Now submission',
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Preferred game: ${preferredGame || 'Not provided'}`,
      ].join('\n'),
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!webhookResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to send form to Discord webhook.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while submitting form.' },
      { status: 500 }
    );
  }
}
