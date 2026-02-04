import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'susscore — is this link sketchy?',
  description: 'Instant scam detection for suspicious URLs. Paste a link, get a sus score.',
  keywords: ['scam', 'phishing', 'url checker', 'link safety', 'security'],
  openGraph: {
    title: 'susscore — is this link sketchy?',
    description: 'Instant scam detection for suspicious URLs.',
    url: 'https://susscore.com',
    siteName: 'susscore',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'susscore',
    description: 'Paste a link. Find out if it\'s sketchy.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
