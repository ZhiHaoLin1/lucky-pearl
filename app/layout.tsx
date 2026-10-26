import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import DeviceIdSync from '@/components/DeviceIdSync';

export const metadata: Metadata = {
  title: 'Lucky Pearl — Premium Online Gaming',
  description: 'Experience the thrill of Golden Dragon, Magic City, River, Fire Phoenix, Ultra Thunder, and Dragon Fury at Lucky Pearl — the premier online gaming destination.',
  keywords: 'Lucky Pearl, online gaming, Golden Dragon, Magic City, River, Fire Phoenix, Ultra Thunder, Dragon Fury',
  openGraph: {
    title: 'Lucky Pearl — Premium Online Gaming',
    description: 'Where fortune favors the bold. Play Golden Dragon, Magic City, River, Fire Phoenix, Ultra Thunder & Dragon Fury.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
        {children}
        <ChatWidget />
        <DeviceIdSync />
      </body>
    </html>
  );
}
