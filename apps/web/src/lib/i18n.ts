// Simple in-memory translation mechanism
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';

const dictionaries: Record<string, any> = { en, hi, te };

export function useTranslation(lang: string) {
  const dict = dictionaries[lang] || en;
  return (key: string) => dict[key] || key;
}
