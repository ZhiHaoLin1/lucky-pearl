type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set — cannot send email.');
    return { ok: false };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Lucky Pearl <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!response.ok) {
      console.error('Failed to send email:', await response.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { ok: false };
  }
}
