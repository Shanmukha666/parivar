export interface EvidenceMetric {
  metric_key: string;
  metric_value?: number | null;
  metric_text?: string | null;
  unit: string;
  year?: number | null;
  sample_size?: number | null;
  verification_status: 'verified' | 'pending' | 'rejected';
  is_synthetic: boolean;
  verification_date?: string | null;
  source?: {
    publisher?: string;
    title?: string;
    url?: string | null;
    document_reference?: string | null;
  } | null;
}

export interface EvidenceResult {
  usable: boolean;
  reason: 'verified' | 'verified_data_unavailable' | 'conflicting_verified_data';
  metrics: EvidenceMetric[];
  citations: Array<NonNullable<EvidenceMetric['source']> & { verified: boolean; is_synthetic: boolean }>;
}

const numberPattern = /(?<![A-Za-z])(?:₹\s*)?(\d[\d,]*(?:\.\d+)?)/g;

export function assessEvidence(metrics: EvidenceMetric[]): EvidenceResult {
  if (metrics.some(metric =>
    metric.verification_status !== 'verified' ||
    metric.is_synthetic ||
    !metric.source?.url && !metric.source?.document_reference,
  )) {
    return { usable: false, reason: 'verified_data_unavailable', metrics: [], citations: [] };
  }
  const usable = metrics.filter(metric =>
    metric.verification_status === 'verified' &&
    !metric.is_synthetic &&
    Boolean(metric.source?.url || metric.source?.document_reference),
  );
  if (!usable.length) return { usable: false, reason: 'verified_data_unavailable', metrics: [], citations: [] };

  const values = new Map<string, Set<string>>();
  for (const metric of usable) {
    const value = metric.metric_value ?? metric.metric_text ?? '';
    const key = `${metric.metric_key}:${metric.year ?? 'unknown'}`;
    const set = values.get(key) || new Set<string>();
    set.add(String(value));
    values.set(key, set);
  }
  if (Array.from(values.values()).some(set => set.size > 1)) {
    return { usable: false, reason: 'conflicting_verified_data', metrics: usable, citations: buildCitations(usable) };
  }
  return { usable: true, reason: 'verified', metrics: usable, citations: buildCitations(usable) };
}

function buildCitations(metrics: EvidenceMetric[]) {
  const seen = new Set<string>();
  return metrics.flatMap(metric => {
    const source = metric.source;
    if (!source) return [];
    const key = JSON.stringify(source);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...source, verified: true, is_synthetic: false }];
  });
}

export function validateGeneratedNumbers(reply: string, evidence: EvidenceResult): string[] {
  if (!evidence.usable) return ['verified_data_unavailable'];
  const allowed = new Set<number>();
  for (const metric of evidence.metrics) {
    if (typeof metric.metric_value === 'number') allowed.add(metric.metric_value);
    for (const raw of Array.from(metric.metric_text?.matchAll(numberPattern) || [])) {
      allowed.add(Number(raw[1].replace(/,/g, '')));
    }
  }
  const unsupported: string[] = [];
  for (const match of Array.from(reply.matchAll(numberPattern))) {
    const value = Number(match[1].replace(/,/g, ''));
    if (value > 10 && !allowed.has(value)) unsupported.push(match[1]);
  }
  return unsupported;
}

export function requiresQuantitativeEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    'salary', 'earn', 'income', 'placement', 'percent', '%', 'fee', 'cost',
    'duration', 'how much', 'kitna', 'कमाई', 'वेतन', 'జీతం',
  ].some(term => normalized.includes(term));
}
