import { speak } from '../lib/speech';

export default function LanguageSelector({ lang, name, onSelect }: { lang: string, name: string, onSelect: () => void }) {
  const handleSelect = () => {
    // Play voice greeting
    const greetings: Record<string, string> = {
      en: 'Welcome. You have selected English.',
      hi: 'नमस्ते। आपने हिंदी चुनी है।',
      te: 'నమస్కారం. మీరు తెలుగు ఎంచుకున్నారు.'
    };
    speak(greetings[lang] || greetings['en'], lang);
    onSelect();
  };

  return (
    <button 
      onClick={handleSelect}
      className="w-full flex items-center justify-between p-6 bg-white border-2 border-orange-200 rounded-xl shadow-sm hover:border-orange-500 active:bg-orange-50 transition-all"
    >
      <span className="text-2xl font-semibold text-gray-800">{name}</span>
      <span className="text-3xl">{lang === 'en' ? '🇬🇧' : lang === 'hi' ? '🇮🇳' : '🕉️'}</span>
    </button>
  );
}
