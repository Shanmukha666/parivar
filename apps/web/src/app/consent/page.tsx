'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { CheckCircle2, User, BookOpen, Users } from 'lucide-react';
import TextToSpeech from '../../components/TextToSpeech';
import ProgressDots from '../../components/ProgressDots';

export default function ConsentPage() {
  const router = useRouter();
  const { language } = useStore();
  const t = useTranslation(language);

  const handleNext = () => {
    router.push('/profile');
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      <div className="flex-1">
        <ProgressDots total={3} current={0} />
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('consent_title')}</h1>
          <TextToSpeech text={t('consent_point1') + ' ' + t('consent_point2') + ' ' + t('consent_point3')} lang={language} />
        </div>

        <div className="space-y-6 mt-10">
          <div className="flex gap-4 items-start bg-orange-50 p-4 rounded-xl">
            <User className="text-orange-500 shrink-0" size={32} />
            <p className="text-xl font-medium text-gray-800">{t('consent_point1')}</p>
          </div>
          
          <div className="flex gap-4 items-start bg-teal-50 p-4 rounded-xl">
            <BookOpen className="text-teal-600 shrink-0" size={32} />
            <p className="text-xl font-medium text-gray-800">{t('consent_point2')}</p>
          </div>

          <div className="flex gap-4 items-start bg-blue-50 p-4 rounded-xl">
            <Users className="text-blue-600 shrink-0" size={32} />
            <p className="text-xl font-medium text-gray-800">{t('consent_point3')}</p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-orange-500 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 active:bg-orange-700 shadow-lg mt-8"
      >
        <CheckCircle2 size={28} /> {t('agree_continue')}
      </button>
    </div>
  );
}
