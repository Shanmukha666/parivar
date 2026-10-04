import type { Source } from './types';
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SessionPayload {
  lang: string;
  state: string;
  district: string;
  user_role: string;
  learner_class: string;
  income_bracket: string;
  consent: boolean;
  selected_trade_id?: number;
}

export interface ChatTurnRequest {
  session_id: string;
  speaker: 'learner' | 'parent' | 'counsellor';
  text: string;
  lang: string;
}

export interface ChatTurnResponse {
  reply: string;
  citations: Array<string | Source>;
  suggested_chips: string[];
  escalate: boolean;
  escalate_reason?: string;
}

export async function createSession(payload: SessionPayload) {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: await getSupabaseAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) return res.json();
  } catch {}
  const res = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function sendChatMessage(data: ChatTurnRequest): Promise<ChatTurnResponse> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: await getSupabaseAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch {}
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function fetchTrades(district?: string, interest?: string, state?: string) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('trades').select('*').order('id');
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (interest) params.append('interest', interest);
  if (state) params.append('state', state);
  const res = await fetch(`${API_BASE_URL}/trades?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch trades');
  return res.json();
}

export async function fetchTradeDetail(id: number | string) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('trades').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch {}
  }
  const res = await fetch(`${API_BASE_URL}/trades/${id}`);
  if (!res.ok) throw new Error('Failed to fetch trade detail');
  return res.json();
}

export async function fetchTradeOutcomes(id: number | string, district?: string, state?: string) {
  const params = new URLSearchParams({ trade_id: String(id), state: state || 'Telangana' });
  if (district) params.set('district', district);
  params.set('include_demo', 'true');
  let records: any[] = [];
  try {
    const res = await fetch(`/api/outcomes?${params.toString()}`);
    if (res.ok) {
      records = await res.json();
    }
  } catch {}
  if (!records.length) {
    try {
      const res = await fetch(`${API_BASE_URL}/outcomes?${params.toString()}`);
      if (res.ok) {
        records = await res.json();
      }
    } catch {}
  }
  const latest = records[0];
  if (!latest) return { found: false };
  const values = Object.fromEntries(records.map((r: any) => [r.metric_key, r.metric_value ?? r.metric_text]));
  return {
    found: true,
    is_synthetic: latest.is_synthetic,
    verified: latest.verification_status === 'verified' && !latest.is_synthetic,
    verification_status: latest.verification_status,
    verification_date: latest.verification_date,
    stale: records.some((r: any) => r.stale),
    sample_size: latest.sample_size,
    cohort_year: latest.year,
    source: latest.source,
    ...values,
    placement_rate: values.placement_rate,
    avg_start_salary_inr: values.starting_earnings,
    scope_label: `${latest.district || latest.state} ${latest.district ? 'district' : 'state'}`,
  };
}

export async function fetchTradePathway(id: number | string) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('pathways').select('*').eq('from_trade_id', id).order('step_order');
      if (!error && data && data.length > 0) return { found: true, steps: data };
    } catch {}
  }
  const res = await fetch(`${API_BASE_URL}/trades/${id}/pathway`);
  if (!res.ok) return { found: false, steps: [] };
  const data = await res.json();
  return { found: Boolean(data?.steps?.length), steps: data.steps || [] };
}

export async function fetchTradeStory(id: number | string, district?: string) {
  const params = new URLSearchParams();
  if (district) params.append('district', district);

  const res = await fetch(`${API_BASE_URL}/trades/${id}/story?${params.toString()}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProviders(district?: string, state?: string) {
  if (supabase) {
    try {
      let query = supabase.from('providers').select('*').eq('state', state || 'Telangana');
      if (district) query = query.eq('district', district);
      const { data, error } = await query.order('name').limit(20);
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (state) params.append('state', state || 'Telangana');
  const res = await fetch(`${API_BASE_URL}/providers?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSchemes(state?: string, income_bracket?: string) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('schemes').select('*').or(`state.eq.${state || 'Telangana'},state.is.null`);
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  const params = new URLSearchParams();
  if (state) params.append('state', state || 'Telangana');
  if (income_bracket) params.append('income_bracket', income_bracket);
  const res = await fetch(`${API_BASE_URL}/schemes?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAdminMetrics(filters?: {
  state?: string;
  district?: string;
  language?: string;
  trade_id?: number;
  provider_id?: number;
  concern?: string;
  start_date?: string;
  end_date?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.state) params.append('state', filters.state);
  if (filters?.district) params.append('district', filters.district);
  if (filters?.trade_id) params.append('trade_id', filters.trade_id.toString());
  if (filters?.language) params.append('language', filters.language);
  if (filters?.provider_id) params.append('provider_id', filters.provider_id.toString());
  if (filters?.concern) params.append('concern', filters.concern);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const res = await fetch(`/api/admin/metrics?${params.toString()}`, { headers: await getSupabaseAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchAdminInsights(state?: string, district?: string) {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (district) params.append('district', district);

  const res = await fetch(`/api/admin/insights?${params.toString()}`, { headers: await getSupabaseAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export async function fetchCounsellorQueue() {
  const res = await fetch('/api/counsellor/queue', { headers: await getSupabaseAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch counsellor queue');
  return res.json();
}

export async function acceptTicket(ticketId: number) {
  const res = await fetch(`/api/counsellor/${ticketId}/accept`, {
    method: 'POST',
    headers: await getSupabaseAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to accept ticket');
  return res.json();
}

export async function resolveTicket(ticketId: number, resolutionNote: string) {
  const res = await fetch(`/api/counsellor/${ticketId}/resolve`, {
    method: 'POST',
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify({ resolution_note: resolutionNote }),
  });
  if (!res.ok) throw new Error('Failed to resolve ticket');
  return res.json();
}

export async function sendCounsellorMessage(sessionId: string, text: string, lang: string = 'en') {
  const res = await fetch('/api/counsellor/messages', {
    method: 'POST',
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify({ session_id: sessionId, text, lang }),
  });
  if (!res.ok) throw new Error('Failed to send counsellor message');
  return res.json();
}

export async function fetchSessionMessages(sessionId: string) {
  const res = await fetch(`/api/counsellor/messages?session_id=${sessionId}`, {
    headers: await getSupabaseAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function createManualEscalation(data: {
  session_id: string;
  reason: string;
  callback_phone?: string;
  callback_phone_consent?: boolean;
  callback_slot?: string;
}) {
  const headers = await getSupabaseAuthHeaders();
  const res = await fetch('/api/escalations', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create escalation');
  return res.json();
}

export async function getSummaryCardHtml(sessionId: string) {
  const headers = await getSupabaseAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/summary-card`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Failed to generate summary card');
  return res.text();
}

export async function login(role: string, phone: string, pin: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, phone, pin }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function patchSession(id: string, data: any) {
  const res = await fetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(supabase ? {} : {})
  };
}

export async function getSupabaseAuthHeaders() {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  return {
    'Content-Type': 'application/json',
    ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
  };
}
