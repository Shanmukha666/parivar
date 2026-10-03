import assert from 'node:assert/strict';
import fs from 'node:fs';

const speech = fs.readFileSync(new URL('../src/lib/speech.ts', import.meta.url), 'utf8');
const voiceButton = fs.readFileSync(new URL('../src/components/VoiceButton.tsx', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../src/app/chat/page.tsx', import.meta.url), 'utf8');

const locales = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' };
for (const [language, locale] of Object.entries(locales)) {
  assert.match(speech, new RegExp(`${language}: '${locale}'`));
}

assert.match(speech, /getSpeechLocale\(lang: string\): string \| null/);
assert.match(voiceButton, /not-allowed|service-not-allowed/);
assert.match(voiceButton, /audio-capture/);
assert.match(voiceButton, /no-speech/);
assert.match(voiceButton, /onTranscript\(transcript\)/);
assert.match(voiceButton, /voice_language_unsupported/);
assert.match(voiceButton, /recognitionRef\.current\?\.abort/);
assert.match(chat, /<VoiceButton onTranscript=\{setInputText\} \/>/);
assert.doesNotMatch(chat, /<VoiceButton onResult=\{handleSend\}/);

console.log('voice contract passed: language mapping, failure handling, local transcript editing, and no direct audio send');
