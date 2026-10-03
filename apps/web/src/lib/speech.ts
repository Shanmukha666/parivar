export function speakText(text: string, lang: string = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip Markdown characters and formatting for natural speech
  const cleanText = text
    .replace(/[#*_~`]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);

  if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else if (lang === 'te') {
    utterance.lang = 'te-IN';
  } else {
    utterance.lang = 'en-IN';
  }

  utterance.rate = 0.95; // Slightly slower for low-literacy clarity
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export { speakText as speak };
