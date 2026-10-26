import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lucky Pearl Friends — Invite & Play',
  description: 'A friend invited you to Lucky Pearl. Join to get $10 in game credit.',
  robots: { index: false, follow: false },
};

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return children;
}
