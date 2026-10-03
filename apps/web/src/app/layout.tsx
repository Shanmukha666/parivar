import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari, Noto_Sans_Telugu } from 'next/font/google';
import './globals.css';
import ClientLayoutWrapper from '../components/ClientLayoutWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notohindi = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-noto-hindi' });
const nototelugu = Noto_Sans_Telugu({ subsets: ['telugu'], variable: '--font-noto-telugu' });

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
      <body className={`${inter.variable} ${notohindi.variable} ${nototelugu.variable} font-sans bg-background text-textDark min-h-screen`}>
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
