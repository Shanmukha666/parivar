import { speak } from '../lib/speech';

export default function LanguageSelector({ lang, name, onSelect }: { lang: string, name: string, onSelect: () => void }) {
  const handleSelect = () => {
    // Play voice greeting
    const greetings: Record<string, string> = {
      en: 'Welcome. You have selected English.',
      hi: 'नमस्ते। आपने हिंदी चुनी है।',
      te: 'నమస్కారం. మీరు తెలుగు ఎంచుకున్నారు.',
      ta: 'வணக்கம். நீங்கள் தமிழைத் தேர்ந்தெடுத்துள்ளீர்கள்.'
    };
    speak(greetings[lang] || greetings['en'], lang);
    onSelect();
  };

  return (
    <button 
      type="button"
      onClick={handleSelect}
      className="language-choice group flex min-h-[64px] w-full items-center justify-between rounded-2xl border border-white/10 px-4 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d6f36a]"
    >
      <span className="text-base font-bold text-white">{name}</span>
      <span className="flex items-center gap-2 text-sm font-bold text-white/40 transition-colors group-hover:text-[#d6f36a]">{lang.toUpperCase()} <span className="text-lg">↗</span></span>
    </button>
  );
}
