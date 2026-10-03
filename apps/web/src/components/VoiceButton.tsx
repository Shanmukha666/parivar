'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useStore } from '../lib/store';

export default function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const { language } = useStore();

  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is supported in Chrome/Edge browsers. You can also type or tap objection chips.');
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set regional language tag
      if (language === 'hi') {
        recognition.lang = 'hi-IN';
      } else if (language === 'te') {
        recognition.lang = 'te-IN';
      } else {
        recognition.lang = 'en-IN';
      }

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          onResult(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setListening(false);
    }
  };

  return (
    <button
      onClick={toggleListening}
      className={`p-3.5 rounded-xl font-bold min-h-[48px] min-w-[48px] flex items-center justify-center transition-all ${
        listening
          ? 'bg-rose-600 text-white animate-pulse shadow-lg scale-105'
          : 'bg-orange-700 hover:bg-orange-800 text-white shadow-sm'
      }`}
      title={listening ? 'Listening... Speak now' : 'Speak in your language'}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
    >
      {listening ? <MicOff size={22} /> : <Mic size={22} />}
    </button>
  );
}
