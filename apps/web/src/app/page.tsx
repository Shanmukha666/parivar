'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';
import LanguageSelector from '../components/LanguageSelector';

export default function Home() {
  const router = useRouter();
  const { setLanguage } = useStore();

  const handleSelect = (lang: string) => {
    setLanguage(lang);
    router.push('/consent');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-orange-50">
      <h1 className="text-3xl font-bold mb-8 text-primary">Parivar Path</h1>
      <h2 className="text-xl mb-6 font-medium">Select Language / भाषा चुनें / భాషను ఎంచుకోండి</h2>
      
      <div className="w-full space-y-4">
        <LanguageSelector lang="en" name="English" onSelect={() => handleSelect('en')} />
        <LanguageSelector lang="hi" name="हिंदी" onSelect={() => handleSelect('hi')} />
        <LanguageSelector lang="te" name="తెలుగు" onSelect={() => handleSelect('te')} />
      </div>
    </div>
  );
}
