'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import ProgressDots from '../../components/ProgressDots';
import IconPicker from '../../components/IconPicker';
import TextToSpeech from '../../components/TextToSpeech';
import { ChevronRight } from 'lucide-react';

const stateDistricts: Record<string, string[]> = {
  Telangana: ['Adilabad', 'Karimnagar', 'Hyderabad'],
};

export default function ProfilePage() {
  const router = useRouter();
  const { language, updateProfile } = useStore();
  const t = useTranslation(language);

  const [state, setState] = useState('Telangana');
  const [district, setDistrict] = useState('Adilabad');
  const [role, setRole] = useState('both');
  const [classPassed, setClassPassed] = useState('Class 10 Pass');
  const [income, setIncome] = useState('₹1 - 3 Lakhs');
  const [interests, setInterests] = useState<string[]>(['electrical', 'mechanical']);

  const handleStateChange = (newState: string) => {
    setState(newState);
    const firstDist = stateDistricts[newState]?.[0] || '';
    setDistrict(firstDist);
  };

  const handleNext = () => {
    updateProfile({ state, district, role, classPassed, income, interests });
    router.push('/trades');
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white overflow-y-auto max-w-xl mx-auto">
      <ProgressDots total={3} current={1} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">{t('profile_title')}</h1>
        <TextToSpeech text={t('profile_title')} lang={language} />
      </div>

      <div className="space-y-6 flex-1">
        {/* User Role */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Who is participating right now?</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'learner', label: 'Learner (Student)' },
              { id: 'parent', label: 'Parent / Family' },
              { id: 'both', label: 'Both Together' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`p-3 rounded-xl border-2 font-semibold text-xs transition-all min-h-[48px] ${
                  role === r.id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Selectors */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Location (State & District)</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 min-h-[48px]"
            >
              <option value="Telangana">Telangana</option>
            </select>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 min-h-[48px]"
            >
              {(stateDistricts[state] || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Class Passed */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Highest Education Passed</label>
          <div className="grid grid-cols-3 gap-2">
            {['Class 8 Pass', 'Class 10 Pass', 'Class 12 Pass'].map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setClassPassed(cls)}
                className={`p-3 rounded-xl border-2 font-semibold text-xs min-h-[48px] ${
                  classPassed === cls
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Annual Income Bracket */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Household Annual Income (For scholarships)</label>
          <div className="grid grid-cols-3 gap-2">
            {['Below ₹1 Lakh', '₹1 - 3 Lakhs', '₹3 - 5 Lakhs'].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => setIncome(inc)}
                className={`p-3 rounded-xl border-2 font-semibold text-xs min-h-[48px] ${
                  income === inc
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {inc}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Learner Interests</label>
          <IconPicker selected={interests} onChange={setInterests} />
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg mt-8 min-h-[52px] transition-all"
      >
        <span>{t('next')}</span>
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
