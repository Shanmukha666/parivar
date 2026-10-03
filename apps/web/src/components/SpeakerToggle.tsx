import { useStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';

export default function SpeakerToggle({ speaker, onChange }: { speaker: 'learner' | 'parent', onChange: (s: 'learner' | 'parent') => void }) {
  const { language } = useStore();
  const t = useTranslation(language);
  return (
    <div className="flex p-1 bg-gray-100 rounded-xl mb-4 shadow-inner">
      <button 
        className={`flex-1 py-3 px-4 text-lg font-medium rounded-lg transition-colors ${speaker === 'learner' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
        onClick={() => onChange('learner')}
        aria-pressed={speaker === 'learner'}
        aria-label={t('switch_to_learner')}
      >
        {t('learner')} 🧑‍🎓
      </button>
      <button 
        className={`flex-1 py-3 px-4 text-lg font-medium rounded-lg transition-colors ${speaker === 'parent' ? 'bg-white shadow text-secondary' : 'text-gray-500'}`}
        onClick={() => onChange('parent')}
        aria-pressed={speaker === 'parent'}
        aria-label={t('switch_to_parent')}
      >
        {t('parent')} 👨‍👩‍👦
      </button>
    </div>
  );
}
