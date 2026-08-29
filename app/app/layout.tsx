import type { Metadata } from 'next';
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Outfit,
} from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Geometric grotesque, kept for the session stage.
const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

// The didone the landing page and the console are set in — the same register
// as the magazine cover in the collage, and the reason the pages read as print
// rather than as another dashboard.
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Solace — Clinician-Guided Emotional Companion',
  description:
    'Turns a written care plan into a Perxona avatar companion, with the boundaries and escalations a clinician sets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
