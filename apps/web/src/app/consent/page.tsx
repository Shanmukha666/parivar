'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { CheckCircle2, User, BookOpen, Users, AlertCircle } from 'lucide-react';
import TextToSpeech from '../../components/TextToSpeech';
import ProgressDots from '../../components/ProgressDots';

export default function ConsentPage() {
  const router = useRouter();
  const { language, updateProfile } = useStore();
  const t = useTranslation(language);
  const [agreed, setAgreed] = useState(false);

  const handleNext = () => {
    if (agreed) {
      updateProfile({ consent: true });
      router.push('/profile');
    }
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

          <div className="flex gap-4 items-start bg-amber-50 p-4 rounded-xl">
            <AlertCircle className="text-amber-600 shrink-0" size={32} />
            <p className="text-xl font-medium text-gray-800">For minors under 18, a parent or guardian must also agree to this service.</p>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-4 p-4 border-2 border-slate-200 rounded-xl bg-slate-50">
          <input 
            type="checkbox" 
            id="consent-check" 
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-6 h-6 text-orange-600 rounded focus:ring-orange-500"
          />
          <label htmlFor="consent-check" className="text-lg text-slate-800 cursor-pointer">
            I understand and give consent. (You can request to delete your data at any time by speaking to a counsellor).
          </label>
        </div>
      </div>

      <button 
        onClick={handleNext}
        disabled={!agreed}
        className="w-full bg-orange-500 text-white font-bold text-xl py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-8 transition-colors"
      >
        <CheckCircle2 size={28} /> {t('agree_continue')}
      </button>
    </div>
  );
}
