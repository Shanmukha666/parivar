export const CONCERN_CATEGORIES = [
  'income_potential',
  'job_security',
  'social_perception_status',
  'safety',
  'further_education',
  'career_progression',
  'training_quality',
  'migration_location',
  'family_affordability',
  'gender_family_concerns',
  'recognition_of_qualification',
  'other_unknown',
] as const;

export type ConcernCategory = typeof CONCERN_CATEGORIES[number];
export type ConcernIntensity = 'LOW' | 'MEDIUM' | 'HIGH';

const KEYWORDS: Record<ConcernCategory, string[]> = {
  income_potential: ['salary', 'earn', 'income', 'paisa', 'kamai', 'rupee', '₹', 'वेतन', 'कमाई', 'పैसे', 'జీతం', 'డబ్బు'],
  job_security: ['job', 'naukri', 'employment', 'permanent', 'stable', 'rozgaar', 'नौकरी', 'रोजगार', 'मिलेगी', 'ఉద్యోగం', 'ఉద్యోగం వస్తుందా'],
  social_perception_status: ['respect', 'izzat', 'status', 'relatives', 'society', 'समाज', 'इज़्ज़त', 'लोग क्या कहेंगे', 'గౌరవం'],
  safety: ['safe', 'danger', 'injury', 'accident', 'risk', 'सुरक्षा', 'खतरा', 'భద్రత', 'ప్రమాదం'],
  further_education: ['degree', 'college', 'university', 'b.tech', 'engineering', 'डिग्री', 'कॉलेज', 'చదువు', 'కాలేజీ'],
  career_progression: ['growth', 'promotion', 'career path', 'progress', 'future', 'तरक्की', 'करियर', 'ఎదుగుదల', 'కెరీర్'],
  training_quality: ['quality', 'trainer', 'instructor', 'equipment', 'गुणवत्ता', 'प्रशिक्षक', 'శిక్షణ నాణ్యత', 'ట్రైనర్'],
  migration_location: ['away', 'relocate', 'migration', 'move', 'city', 'near home', 'दूर', 'शहर', 'इంటి దగ్గర', 'ఇంటి దగ్గర', 'వలస'],
  family_affordability: ['cost', 'fee', 'fees', 'expensive', 'afford', 'kharcha', 'खर्चा', 'फीस', 'ఖర్చు', 'ఫీజు'],
  gender_family_concerns: ['daughter', 'girl', 'women', 'marriage', 'family permission', 'बेटी', 'लड़की', 'महिला', 'शादी', 'కూతురు', 'అమ్మాయి'],
  recognition_of_qualification: ['certificate valid', 'recognised', 'recognition', 'मान्यता', 'प्रमाणपत्र', 'certificate', 'గుర్తింపు', 'సర్టిఫికేట్'],
  other_unknown: [],
};

const HIGH_MARKERS = ['urgent', 'very worried', 'afraid', 'fear', 'must', 'no way', 'क्या होगा', 'मिलेगी क्या', 'जरूरी', 'చాలా భయం', 'వస్తుందా'];

export interface ConcernClassification {
  concerns: ConcernCategory[];
  concern_intensity: ConcernIntensity;
  is_diagnostic: false;
  classification_basis: 'deterministic_keyword_fallback';
}

export function classifyConcerns(text: string): ConcernClassification {
  const normalized = text.toLocaleLowerCase();
  const concerns = (Object.entries(KEYWORDS) as [ConcernCategory, string[]][])
    .filter(([category, keywords]) => category !== 'other_unknown' && keywords.some(keyword => normalized.includes(keyword.toLocaleLowerCase())))
    .map(([category]) => category);
  const selected: ConcernCategory[] = concerns.length ? concerns : ['other_unknown'];
  const high = normalized.includes('?') || HIGH_MARKERS.some(marker => normalized.includes(marker.toLocaleLowerCase()));
  return {
    concerns: selected,
    concern_intensity: high ? 'HIGH' : text.trim().split(/\s+/).length <= 3 ? 'LOW' : 'MEDIUM',
    is_diagnostic: false,
    classification_basis: 'deterministic_keyword_fallback',
  };
}

export interface ConcernState {
  initial_concerns: ConcernCategory[];
  evidence_presented: Array<Record<string, unknown>>;
  current_concerns: ConcernCategory[];
  unresolved_concerns: ConcernCategory[];
  current_intensity: ConcernIntensity;
  escalation_status: 'not_escalated' | 'escalated' | 'resolved';
  is_diagnostic: false;
}

export function updateConcernState(
  state: Partial<ConcernState> | null | undefined,
  classification: ConcernClassification,
  evidence: Array<Record<string, unknown>> = [],
  escalationStatus?: ConcernState['escalation_status'],
): ConcernState {
  const prior = state || {};
  const merge = (values: ConcernCategory[] = []) => Array.from(new Set(values.concat(classification.concerns)));
  return {
    initial_concerns: merge(prior.initial_concerns),
    evidence_presented: Array.from(
      new Set([...(prior.evidence_presented || []), ...evidence].map(item => JSON.stringify(item))),
    ).map(item => JSON.parse(item) as Record<string, unknown>),
    current_concerns: merge(prior.current_concerns),
    unresolved_concerns: merge(prior.unresolved_concerns),
    current_intensity: classification.concern_intensity,
    escalation_status: escalationStatus || prior.escalation_status || 'not_escalated',
    is_diagnostic: false,
  };
}
