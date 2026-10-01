import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Prize Wheel — Lucky Pearl',
  description: 'Spin the Lucky Pearl wheel once a day for a prize.',
  robots: { index: false, follow: false },
};

export default function SpinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
