const SPEECH_LOCALES = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
} as const;

export type SpeechLanguage = keyof typeof SPEECH_LOCALES;

export function getSpeechLocale(lang: string): string | null {
  return Object.prototype.hasOwnProperty.call(SPEECH_LOCALES, lang)
    ? SPEECH_LOCALES[lang as SpeechLanguage]
    : null;
}

export function speakText(text: string, lang: string = 'en'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip Markdown characters and formatting for natural speech
  const cleanText = text
    .replace(/[#*_~`]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  if (!cleanText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const locale = getSpeechLocale(lang);
  if (!locale) return false;
  utterance.lang = locale;

  utterance.rate = 0.95; // Slightly slower for low-literacy clarity
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export { speakText as speak };
