// Rule-based message analysis. Fills public.message_analysis so the admin "where and why"
// dashboard has real data (the Next.js chat route previously wrote nothing there, so every
// objection and sentiment metric was empty).
//
// This is a transparent baseline, not the final classifier. The Telugu and Hindi keyword lists need
// a native reviewer, and the plan is to replace this with an LLM classifier scored against a labelled set.
export type Objection = 'income' | 'safety' | 'status' | 'job_security' | 'degree_pref' | 'cost' | 'none';
export type Intent = 'ask_info' | 'express_concern' | 'express_acceptance' | 'request_human' | 'other';
export interface Analysis { objection: Objection; sentiment: number; intent: Intent }

const OBJECTION_KEYWORDS: Record<Exclude<Objection, 'none'>, string[]> = {
  income: ['salary', 'earn', 'income', 'pay ', 'wage', 'money', 'kamai', 'tankhwah', 'paisa', 'jeetam', 'sampadana',
           'तनख्वाह', 'वेतन', 'कमाई', 'पैसे', 'आमदनी', 'జీతం', 'ఆదాయం', 'డబ్బు', 'సంపాదన'],
  safety: ['safe', 'danger', 'risk', 'accident', 'injury', 'khatra', 'surakshit', 'pramadam',
           'सुरक्षित', 'खतरा', 'चोट', 'हादसा', 'जोखिम', 'ప్రమాదం', 'భద్రత', 'గాయం'],
  status: ['relatives', 'neighbour', 'neighbor', 'respect', 'izzat', 'log kya', 'society', 'shame', 'status', 'parauvu', 'gouravam',
           'रिश्तेदार', 'इज्जत', 'इज़्ज़त', 'लोग क्या', 'समाज', 'सम्मान', 'బంధువులు', 'గౌరవం', 'పరువు', 'సమాజం'],
  job_security: ['job', 'permanent', 'secure job', 'placement', 'unemploy', 'naukri', 'udyogam', 'rozgar',
                 'नौकरी', 'रोजगार', 'रोज़गार', 'पक्की', 'ఉద్యోగం', 'ఉపాధి'],
  degree_pref: ['degree', 'engineering', 'college', 'graduate', 'btech', 'b.tech', 'डिग्री', 'कॉलेज', 'ఇంజనీరింగ్', 'డిగ్రీ', 'కాలేజీ'],
  cost: ['fee', 'fees', 'cost', 'afford', 'expensive', 'loan', 'kharcha', 'kharch', 'kharchu', 'फीस', 'खर्च', 'महंगा', 'ఫీజు', 'ఖర్చు', 'ఖర్చులు'],
};
const NEGATIVE = ['worried', 'afraid', 'scared', 'not sure', 'unsure', 'doubt', 'no use', 'waste', 'bad', 'problem', 'difficult',
  'डर', 'चिंता', 'परेशान', 'बेकार', 'शक', 'భయం', 'ఆందోళన', 'సందేహం', 'వ్యర్థం', 'సమస్య'];
const POSITIVE = ['good', 'great', 'happy', 'thanks', 'thank you', 'sounds good', 'helpful', 'okay then', 'will join', 'interested',
  'अच्छा', 'धन्यवाद', 'ठीक है', 'खुश', 'బాగుంది', 'ధన్యవాదాలు', 'సంతోషం', 'సరే'];
const HUMAN = ['counsellor', 'counselor', 'talk to a person', 'call me', 'human', 'काउंसलर', 'बात करनी', 'కౌన్సెలర్', 'మాట్లాడాలి'];
const ASK = ['how', 'what', 'why', 'when', 'which', 'कितना', 'क्या', 'कैसे', 'ఎంత', 'ఏమి', 'ఎలా', '?', '？'];

const isLatin = (s: string) => /^[a-z0-9 .\-']+$/i.test(s);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// \b only understands ASCII, so Latin keywords get explicit boundaries and Indic scripts use substring matching.
function hit(text: string, kw: string) {
  if (!isLatin(kw)) return text.includes(kw);
  return new RegExp(`(^|[^a-z])${esc(kw.trim())}([^a-z]|$)`, 'i').test(text);
}
const count = (text: string, list: string[]) => list.reduce((n, kw) => n + (hit(text, kw) ? 1 : 0), 0);

export function analyseMessage(raw: string): Analysis {
  const text = raw.normalize('NFC').toLowerCase();
  let objection: Objection = 'none';
  let best = 0;
  for (const [key, list] of Object.entries(OBJECTION_KEYWORDS) as [Exclude<Objection, 'none'>, string[]][]) {
    const n = count(text, list);
    if (n > best) { best = n; objection = key; }
  }
  const neg = count(text, NEGATIVE) + (objection !== 'none' ? 1 : 0);   // naming a concern is itself mildly negative
  const pos = count(text, POSITIVE);
  const sentiment = Math.max(-1, Math.min(1, Number(((pos - neg) / Math.max(1, pos + neg)).toFixed(2))));

  let intent: Intent = 'other';
  if (count(text, HUMAN) > 0) intent = 'request_human';
  else if (pos > neg && pos > 0) intent = 'express_acceptance';
  else if (neg > 0) intent = 'express_concern';
  else if (count(text, ASK) > 0) intent = 'ask_info';
  return { objection, sentiment, intent };
}
