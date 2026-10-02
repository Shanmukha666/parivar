import { Volume2 } from 'lucide-react';
import { speak } from '../lib/speech';

export default function TextToSpeech({ text, lang = 'en' }: { text: string, lang?: string }) {
  return (
    <button 
      onClick={() => speak(text, lang)}
      className="p-2 text-gray-500 hover:text-orange-500 rounded-full hover:bg-orange-50"
      aria-label="Read Aloud"
    >
      <Volume2 size={24} />
    </button>
  );
}
