import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Parivar Path',
  description: 'Vocational counselling platform',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-textDark min-h-screen`}>
        <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex flex-col relative">
          {children}
        </main>
      </body>
    </html>
  );
}
