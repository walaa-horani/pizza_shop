import type { Metadata } from 'next';
import { Lexend, Manrope } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const lexend = Lexend({ variable: '--font-lexend', subsets: ['latin'] });
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premium Neapolitan Pizza App',
  description: 'Forged in Fire.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className={`${lexend.variable} ${manrope.variable} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
