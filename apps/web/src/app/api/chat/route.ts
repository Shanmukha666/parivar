import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { GeminiProvider, type VerifiedOutcome } from '../../../lib/ai/provider';

const MAX_MESSAGES_PER_SESSION = 30;
const DISTRESS_TERMS = ['self harm', 'suicide', 'want to die', 'kill myself', 'आत्महत्या'];

function redactPersonalData(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/\b[6-9]\d{9}\b/g, '[phone removed]');
}

function hasDistressSignal(value: string) {
  const normalized = value.toLowerCase();
  return DISTRESS_TERMS.some(term => normalized.includes(term));
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json() as {
    session_id?: string;
    speaker?: 'learner' | 'parent';
    text?: string;
    lang?: 'en' | 'te' | 'hi';
  };
  if (!body.session_id || !body.text || !body.speaker || !body.lang || body.text.length > 1000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, owner_id, state, district, lang, selected_trade_id, trades(name_en)')
    .eq('id', body.session_id)
    .eq('owner_id', user.id)
    .single();
  if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', body.session_id);
  if ((count || 0) >= MAX_MESSAGES_PER_SESSION) {
    return NextResponse.json({ error: 'Session message limit reached', code: 'SESSION_CAP' }, { status: 429 });
  }

  const { error: insertError } = await supabase.from('messages').insert({
    session_id: body.session_id,
    speaker: body.speaker,
    text: body.text,
    lang: body.lang,
  });
  if (insertError) return NextResponse.json({ error: 'Could not save message' }, { status: 500 });

  if (hasDistressSignal(body.text)) {
    await supabase.from('escalations').insert({
      session_id: session.id,
      reason: 'Distress signal detected',
      status: 'new',
      priority: 'urgent',
      language: session.lang,
      district: session.district,
      sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    return NextResponse.json({
      reply: 'I am sorry you are feeling this way. Please pause this chat and contact a trusted person or local emergency support now. A counsellor request has been marked high priority. Crisis guidance is currently a placeholder pending review.',
      citations: [],
      suggested_chips: [],
      escalate: true,
      escalate_reason: 'distress_signal',
      priority: 'high',
    });
  }

  let outcomes: VerifiedOutcome | null = null;
  if (session.selected_trade_id) {
    const { data } = await supabase
      .from('outcomes')
      .select('district, state, placement_rate, avg_start_salary_inr, salary_3yr_min, salary_3yr_max, sample_size, cohort_year, source, verified_on, verified, is_synthetic, evidence_url')
      .eq('trade_id', session.selected_trade_id)
      .eq('state', session.state)
      .eq('district', session.district)
      .order('cohort_year', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) outcomes = { ...data, scope: 'district' } as VerifiedOutcome;
  }

  try {
    const provider = new GeminiProvider();
    const result = await provider.generate({
      language: body.lang,
      speaker: body.speaker,
      userMessage: redactPersonalData(body.text),
      location: { state: session.state, district: session.district },
      tradeName: (session.trades as { name_en?: string } | null)?.name_en,
      verifiedOutcomes: outcomes,
    });

    const { error: aiMessageError } = await supabase.rpc('insert_ai_message', {
      target_session_id: body.session_id,
      message_text: result.text,
      message_lang: body.lang,
    });
    if (aiMessageError) throw aiMessageError;

    return NextResponse.json({
      reply: result.text,
      citations: outcomes ? [{ name: outcomes.source, year: String(outcomes.cohort_year), verified: outcomes.verified, is_synthetic: outcomes.is_synthetic, sample_size: outcomes.sample_size, scope: outcomes.scope, verified_on: outcomes.verified_on, evidence_url: outcomes.evidence_url }] : [],
      suggested_chips: [],
      escalate: false,
    });
  } catch (error) {
    const rateLimited = error instanceof Error && error.message === 'AI_RATE_LIMITED';
    return NextResponse.json({
      reply: rateLimited
        ? 'The counselling assistant is busy right now. Your verified data is safe; please try again shortly or request a human counsellor.'
        : 'I cannot reach the counselling assistant right now. Verified data is unavailable; please try again or request a human counsellor.',
      citations: [],
      suggested_chips: [],
      escalate: false,
      degraded: true,
    }, { status: rateLimited ? 429 : 503 });
  }
}
