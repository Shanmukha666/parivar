'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '../lib/store';
import { useEffect } from 'react';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useStore();

  useEffect(() => {
    document.documentElement.lang = language || 'en';
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }, [language]);

  const isStaffRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/counsellor');
  const isLandingRoute = pathname === '/';

  if (isStaffRoute || isLandingRoute) {
    return <main className="min-h-screen bg-white flex flex-col relative">{children}</main>;
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex flex-col relative">
      {children}
    </main>
  );
}
