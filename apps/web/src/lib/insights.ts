// Admin insights built ONLY from the aggregates the admin RPCs return.
// The original route returned three hard-coded sentences, one of which asserted a fabricated
// statistic ("reduces parent hesitation by 40%") as if it were district data.
export interface Kpis { total_sessions: number; escalation_rate: number; avg_sentiment_shift: number | null }
export interface HeatRow { district: string; session_count: number; resistance_index: number | null }

const LABEL: Record<string, string> = {
  income: 'income worries', safety: 'safety worries', status: 'social-status worries',
  job_security: 'job-security worries', degree_pref: 'preference for a degree', cost: 'cost worries',
};
const MIN_SESSIONS = 30;

export function buildInsights(k: Kpis | null, heat: HeatRow[], objections: Record<string, number>): { insights: string[]; weak_signal: boolean } {
  if (!k || k.total_sessions < MIN_SESSIONS) {
    return {
      insights: [`Only ${k?.total_sessions ?? 0} sessions so far. Insights unlock at ${MIN_SESSIONS} so that no conclusion rests on a handful of families.`],
      weak_signal: true,
    };
  }
  const out: string[] = [];
  const top = Object.entries(objections).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 0) {
    const share = Math.round((top[1] / k.total_sessions) * 100);
    out.push(`The most common concern is ${LABEL[top[0]] ?? top[0]}, raised in ${share}% of sessions.`);
  }
  const ranked = heat.filter(h => h.resistance_index != null).sort((a, b) => (b.resistance_index! - a.resistance_index!));
  if (ranked.length) out.push(`${ranked[0].district} shows the highest resistance index (${ranked[0].resistance_index}) across ${ranked[0].session_count} sessions.`);
  const hidden = heat.filter(h => h.resistance_index == null).length;
  if (hidden) out.push(`${hidden} district(s) have fewer than 10 sessions and are hidden to protect families' privacy.`);
  out.push(`${Math.round(k.escalation_rate * 100)}% of sessions asked for a human counsellor.`);
  if (k.avg_sentiment_shift != null) {
    const dir = k.avg_sentiment_shift > 0 ? 'improved' : k.avg_sentiment_shift < 0 ? 'worsened' : 'did not change';
    out.push(`On average, family sentiment ${dir} over the conversation (${k.avg_sentiment_shift > 0 ? '+' : ''}${k.avg_sentiment_shift}).`);
  }
  return { insights: out, weak_signal: false };
}
