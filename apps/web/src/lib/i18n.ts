import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ta from '../locales/ta.json';

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'te', 'ta'] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];
export type TranslationKey = keyof typeof en;
export type TranslationStatus = 'DRAFT' | 'REVIEWED';

export const translationStatus: Record<Language, TranslationStatus> = {
  en: 'REVIEWED',
  hi: 'DRAFT',
  te: 'DRAFT',
  ta: 'DRAFT',
};

const dictionaries: Record<Language, Record<string, string>> = { en, hi, te, ta };

export function isSupportedLanguage(lang: string): lang is Language {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
}

export function useTranslation(lang: string) {
  const dict = dictionaries[isSupportedLanguage(lang) ? lang : 'en'];
  return (key: TranslationKey, variables: Record<string, string | number> = {}) => {
    const template = dict[key] || en[key];
    if (!template) return key;
    return template.replace(/\{(\w+)\}/g, (match, variable: string) =>
      Object.prototype.hasOwnProperty.call(variables, variable) ? String(variables[variable]) : match,
    );
  };
}

export function missingTranslationKeys(): Record<Language, string[]> {
  const keys = Object.keys(en);
  return Object.fromEntries(
    SUPPORTED_LANGUAGES.map(lang => [lang, keys.filter(key => !dictionaries[lang][key])]),
  ) as Record<Language, string[]>;
}

export function malformedInterpolationKeys(): Record<Language, string[]> {
  const keys = Object.keys(en) as TranslationKey[];
  return Object.fromEntries(SUPPORTED_LANGUAGES.map(lang => [
    lang,
    keys.filter(key => {
      const source = en[key].match(/\{(\w+)\}/g) || [];
      const target = dictionaries[lang][key].match(/\{(\w+)\}/g) || [];
      return source.join('|') !== target.join('|');
    }),
  ])) as Record<Language, string[]>;
}

export const VOCATIONAL_GLOSSARY: Record<Language, Record<string, string>> = {
  en: {
    vocational_training: 'Vocational training',
    training_provider: 'Training provider',
    placement_rate: 'Placement rate',
    earnings: 'Earnings',
    progression: 'Progression',
    nsqf: 'NSQF level',
    counsellor: 'Counsellor',
    verified_data: 'Verified data',
    synthetic_data: 'Demo / synthetic data',
  },
  hi: {
    vocational_training: 'व्यावसायिक प्रशिक्षण',
    training_provider: 'प्रशिक्षण प्रदाता',
    placement_rate: 'नियोजन दर',
    earnings: 'कमाई',
    progression: 'प्रगति',
    nsqf: 'NSQF स्तर',
    counsellor: 'काउंसलर',
    verified_data: 'सत्यापित डेटा',
    synthetic_data: 'डेमो / सिंथेटिक डेटा',
  },
  te: {
    vocational_training: 'వృత్తి శిక్షణ',
    training_provider: 'శిక్షణ ప్రదాత',
    placement_rate: 'ఉద్యోగ నియామక రేటు',
    earnings: 'ఆదాయం',
    progression: 'పురోగతి',
    nsqf: 'NSQF స్థాయి',
    counsellor: 'కౌన్సిలర్',
    verified_data: 'ధృవీకరించబడిన డేటా',
    synthetic_data: 'డెమో / సింథటిక్ డేటా',
  },
  ta: {
    vocational_training: 'தொழில்நுட்பப் பயிற்சி',
    training_provider: 'பயிற்சி வழங்குநர்',
    placement_rate: 'வேலைவாய்ப்பு விகிதம்',
    earnings: 'வருமானம்',
    progression: 'முன்னேற்றம்',
    nsqf: 'NSQF நிலை',
    counsellor: 'ஆலோசகர்',
    verified_data: 'சரிபார்க்கப்பட்ட தரவு',
    synthetic_data: 'டெமோ / செயற்கை தரவு',
  },
};

export function formatNumber(value: number, lang: string): string {
  const locale = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' }[lang] || 'en-IN';
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(value: number, lang: string): string {
  const locale = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' }[lang] || 'en-IN';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}
