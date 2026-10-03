import { Volume2 } from 'lucide-react';
import { speak } from '../lib/speech';
import { useTranslation } from '../lib/i18n';

export default function TextToSpeech({ text, lang = 'en' }: { text: string, lang?: string }) {
  const t = useTranslation(lang);
  return (
    <button 
      onClick={() => speak(text, lang)}
      className="p-3 text-gray-600 hover:text-orange-700 rounded-full hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
      aria-label={t('read_aloud')}
      title={t('read_aloud')}
    >
      <Volume2 size={24} />
    </button>
  );
}
