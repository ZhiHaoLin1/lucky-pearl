import type { Metadata } from 'next';
import './globals.css';

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
      </body>
    </html>
  );
}
