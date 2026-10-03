'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { getSpeechLocale } from '../lib/speech';

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
}

export default function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorKey, setErrorKey] = useState<'voice_unavailable' | 'voice_permission_denied' | 'voice_microphone_unavailable' | 'voice_recognition_failed' | 'voice_empty' | 'voice_language_unsupported' | null>(null);
  const recognitionRef = useRef<any>(null);
  const { language } = useStore();
  const t = useTranslation(language);
  const listening = state === 'listening';

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
  }, []);

  const setError = (key: NonNullable<typeof errorKey>) => {
    setState('error');
    setErrorKey(key);
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('voice_unavailable');
      return;
    }

    const locale = getSpeechLocale(language);
    if (!locale) {
      setError('voice_language_unsupported');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = locale;

      recognition.onstart = () => {
        setErrorKey(null);
        setState('listening');
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setState('idle');
      };
      recognition.onerror = (event: { error?: string }) => {
        recognitionRef.current = null;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('voice_permission_denied');
        } else if (event.error === 'audio-capture') {
          setError('voice_microphone_unavailable');
        } else if (event.error === 'no-speech') {
          setError('voice_empty');
        } else {
          setError('voice_recognition_failed');
        }
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim?.() || '';
        if (!transcript) {
          setError('voice_empty');
          return;
        }
        setState('processing');
        onTranscript(transcript);
      };
      recognition.start();
    } catch {
      setError('voice_recognition_failed');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setState('processing');
  };

  const reset = () => {
    setErrorKey(null);
    setState('idle');
  };

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={state === 'processing'}
        className={`p-3.5 rounded-xl font-bold min-h-[48px] min-w-[48px] flex items-center justify-center transition-all ${
          listening
            ? 'bg-rose-600 text-white animate-pulse shadow-lg scale-105'
            : 'bg-orange-700 hover:bg-orange-800 text-white shadow-sm'
        } disabled:cursor-wait disabled:opacity-70`}
        title={listening ? t('voice_stop') : t('voice_start')}
        aria-label={listening ? t('voice_stop') : t('voice_start')}
        aria-pressed={listening}
      >
        {listening ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
      <div className="text-xs text-slate-600 max-w-[14rem]">
        {state === 'listening' && <span>{t('voice_recording')}</span>}
        {state === 'processing' && <span>{t('voice_processing')}</span>}
        {state === 'error' && errorKey && (
          <button type="button" onClick={() => { reset(); startListening(); }} className="text-left underline underline-offset-2">
            {t(errorKey)} {t('voice_retry')}
          </button>
        )}
        {state === 'idle' && <span>{t('voice_privacy')}</span>}
      </div>
    </div>
  );
}
