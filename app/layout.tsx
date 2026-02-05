import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'susscore — is this link sketchy?',
  description:
    'Instant scam detection for suspicious URLs. 9 comprehensive checks including typosquatting, homograph attacks, and reputation databases.',
  keywords: [
    'scam',
    'phishing',
    'url checker',
    'link safety',
    'security',
    'typosquatting',
    'malware detection',
  ],
  openGraph: {
    title: 'susscore — is this link sketchy?',
    description:
      'Instant scam detection for suspicious URLs. 9 comprehensive checks to keep you safe.',
    url: 'https://susscore.com',
    siteName: 'susscore',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'susscore — is this link sketchy?',
    description:
      "Paste a link. Find out if it's sketchy. 9 comprehensive security checks.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className='antialiased'>{children}</body>
      <Analytics />
    </html>
  );
}
