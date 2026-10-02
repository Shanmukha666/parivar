const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SessionPayload {
  lang: string;
  state: string;
  district: string;
  user_role: string;
  learner_class: string;
  income_bracket: string;
  consent: boolean;
}

export interface ChatTurnRequest {
  session_id: string;
  speaker: 'learner' | 'parent' | 'counsellor';
  text: string;
  lang: string;
}

export interface ChatTurnResponse {
  reply: string;
  citations: string[];
  suggested_chips: string[];
  escalate: boolean;
  escalate_reason?: string;
}

export async function createSession(payload: SessionPayload) {
  const res = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function sendChatMessage(data: ChatTurnRequest): Promise<ChatTurnResponse> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function fetchTrades(district?: string, interest?: string, state?: string) {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (interest) params.append('interest', interest);
  if (state) params.append('state', state);

  const res = await fetch(`${API_BASE_URL}/trades?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch trades');
  return res.json();
}

export async function fetchTradeDetail(id: number | string) {
  const res = await fetch(`${API_BASE_URL}/trades/${id}`);
  if (!res.ok) throw new Error('Failed to fetch trade detail');
  return res.json();
}

export async function fetchTradeOutcomes(id: number | string, district?: string, state?: string) {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (state) params.append('state', state);

  const res = await fetch(`${API_BASE_URL}/trades/${id}/outcomes?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch outcomes');
  return res.json();
}

export async function fetchTradePathway(id: number | string) {
  const res = await fetch(`${API_BASE_URL}/trades/${id}/pathway`);
  if (!res.ok) throw new Error('Failed to fetch pathway');
  return res.json();
}

export async function fetchTradeStory(id: number | string, district?: string) {
  const params = new URLSearchParams();
  if (district) params.append('district', district);

  const res = await fetch(`${API_BASE_URL}/trades/${id}/story?${params.toString()}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProviders(district?: string, state?: string) {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (state) params.append('state', state);

  const res = await fetch(`${API_BASE_URL}/providers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  return res.json();
}

export async function fetchSchemes(state?: string, income_bracket?: string) {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (income_bracket) params.append('income_bracket', income_bracket);

  const res = await fetch(`${API_BASE_URL}/schemes?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch schemes');
  return res.json();
}

export async function fetchAdminMetrics(filters?: { state?: string; district?: string; trade_id?: number }) {
  const params = new URLSearchParams();
  if (filters?.state) params.append('state', filters.state);
  if (filters?.district) params.append('district', filters.district);
  if (filters?.trade_id) params.append('trade_id', filters.trade_id.toString());

  const res = await fetch(`${API_BASE_URL}/admin/metrics?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchAdminInsights(state?: string, district?: string) {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (district) params.append('district', district);

  const res = await fetch(`${API_BASE_URL}/admin/insights?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export async function fetchCounsellorQueue() {
  const res = await fetch(`${API_BASE_URL}/counsellor/queue`);
  if (!res.ok) throw new Error('Failed to fetch counsellor queue');
  return res.json();
}

export async function acceptTicket(ticketId: number) {
  const res = await fetch(`${API_BASE_URL}/counsellor/${ticketId}/accept`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to accept ticket');
  return res.json();
}

export async function resolveTicket(ticketId: number, resolutionNote: string) {
  const res = await fetch(`${API_BASE_URL}/counsellor/${ticketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution_note: resolutionNote }),
  });
  if (!res.ok) throw new Error('Failed to resolve ticket');
  return res.json();
}

export async function createManualEscalation(data: {
  session_id: string;
  reason: string;
  callback_phone?: string;
  callback_slot?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/escalations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create escalation');
  return res.json();
}

export async function getSummaryCardHtml(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/summary-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Failed to generate summary card');
  return res.text();
}
