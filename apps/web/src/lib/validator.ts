// Number guard for model output. The model may only state figures that exist in the verified record.
// (The original Next.js route had no check at all. The FastAPI validator that did exist was bypassed.)
import type { Lang } from './safety';

export interface OutcomeRecord {
  district: string; state: string; placement_rate: number | null; avg_start_salary_inr: number | null;
  salary_3yr_min: number | null; salary_3yr_max: number | null; sample_size: number; cohort_year: number;
  source: string; verified_on: string | null; verified: boolean; is_synthetic: boolean; evidence_url: string | null;
}

const DEVANAGARI = '०१२३४५६७८९';
const TELUGU = '౦౧౨౩౪౫౬౭౮౯';
export function toAsciiDigits(s: string) {
  return s.replace(/[०-९]/g, c => String(DEVANAGARI.indexOf(c))).replace(/[౦-౯]/g, c => String(TELUGU.indexOf(c)));
}

/** Figures that matter: money, percentages, and any number of 3+ digits (salaries, years, sample sizes). */
export function extractFigures(text: string): number[] {
  const t = toAsciiDigits(text);
  const out: number[] = [];
  const re = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(%|percent|lakh|lac|k\b)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const raw = m[0];
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'lakh' || unit === 'lac') n *= 100000;
    if (unit === 'k') n *= 1000;
    const isMoney = /^(₹|rs|inr)/i.test(raw.trim());
    const isPercent = unit === '%' || unit === 'percent';
    if (isMoney || isPercent || n >= 100) out.push(n);        // small counts like "3 years" are not claims
  }
  return out;
}

export function allowedFigures(o: OutcomeRecord | null): Set<number> {
  const s = new Set<number>();
  if (!o) return s;
  for (const v of [o.placement_rate, o.avg_start_salary_inr, o.salary_3yr_min, o.salary_3yr_max, o.sample_size, o.cohort_year]) {
    if (typeof v === 'number') { s.add(v); s.add(Math.round(v)); }
  }
  return s;
}

export function validateFigures(reply: string, o: OutcomeRecord | null): { ok: boolean; unmatched: number[] } {
  const allowed = allowedFigures(o);
  const unmatched = extractFigures(reply).filter(n => !allowed.has(n) && !allowed.has(Math.round(n)));
  return { ok: unmatched.length === 0, unmatched };
}

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

/** Deterministic answer built only from the record. Used when the model fails or breaks the number rule. */
export function renderVerifiedSummary(o: OutcomeRecord, trade: string, lang: Lang): string {
  const demo = o.is_synthetic || !o.verified;
  const lines: string[] = [];
  if (lang === 'te') {
    lines.push(`${o.district} జిల్లాలో ${trade} శిక్షణ గురించి (${o.cohort_year} బ్యాచ్, నమూనా ${o.sample_size} మంది):`);
    if (o.placement_rate != null) lines.push(`• ${o.placement_rate}% మందికి ఉద్యోగం దొరికింది.`);
    if (o.avg_start_salary_inr != null) lines.push(`• ప్రారంభ జీతం సుమారు ${fmt(o.avg_start_salary_inr)} నెలకు.`);
    if (o.salary_3yr_min != null && o.salary_3yr_max != null) lines.push(`• 3 సంవత్సరాల తర్వాత ${fmt(o.salary_3yr_min)} నుండి ${fmt(o.salary_3yr_max)} వరకు.`);
    if (demo) lines.push('గమనిక: ఇవి డెమో గణాంకాలు, ఇంకా నిర్ధారణ కాలేదు.');
  } else if (lang === 'hi') {
    lines.push(`${o.district} में ${trade} प्रशिक्षण के बारे में (${o.cohort_year} बैच, नमूना ${o.sample_size} लोग):`);
    if (o.placement_rate != null) lines.push(`• ${o.placement_rate}% को रोज़गार मिला।`);
    if (o.avg_start_salary_inr != null) lines.push(`• शुरुआती वेतन लगभग ${fmt(o.avg_start_salary_inr)} प्रति माह।`);
    if (o.salary_3yr_min != null && o.salary_3yr_max != null) lines.push(`• 3 साल बाद ${fmt(o.salary_3yr_min)} से ${fmt(o.salary_3yr_max)} तक।`);
    if (demo) lines.push('सूचना: ये डेमो आँकड़े हैं, अभी सत्यापित नहीं हैं।');
  } else {
    lines.push(`About ${trade} training in ${o.district} (${o.cohort_year} batch, sample of ${o.sample_size}):`);
    if (o.placement_rate != null) lines.push(`• ${o.placement_rate}% found work.`);
    if (o.avg_start_salary_inr != null) lines.push(`• Starting pay is about ${fmt(o.avg_start_salary_inr)} a month.`);
    if (o.salary_3yr_min != null && o.salary_3yr_max != null) lines.push(`• After 3 years: ${fmt(o.salary_3yr_min)} to ${fmt(o.salary_3yr_max)}.`);
    if (demo) lines.push('Note: these are demo figures and are not yet verified.');
  }
  return lines.join('\n');
}

export function unavailableReply(lang: Lang): string {
  if (lang === 'te') return 'ఈ ప్రశ్నకు నా దగ్గర నిర్ధారిత గణాంకాలు ప్రస్తుతం లేవు. కౌన్సెలర్‌తో మాట్లాడటానికి "కౌన్సెలర్" బటన్ నొక్కండి.';
  if (lang === 'hi') return 'इस सवाल के लिए मेरे पास अभी सत्यापित आँकड़े नहीं हैं। काउंसलर से बात करने के लिए "काउंसलर" बटन दबाएँ।';
  return "I don't have verified figures for this right now. Tap “Counsellor” to talk to a person.";
}
