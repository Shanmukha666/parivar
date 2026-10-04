import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { GeminiProvider, type VerifiedOutcome } from '../../../lib/ai/provider';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { assessEvidence, validateGeneratedNumbers, requiresQuantitativeEvidence, type EvidenceMetric } from '../../../lib/ai/grounding';
import { classifyConcerns, updateConcernState, type ConcernState } from '../../../lib/concern-state';
import { analyseMessage } from '../../../lib/analysis';
import { createSupabaseAdminClient } from '../../../lib/supabase-admin';
import { crisisReply, hasDistressSignal as detectsDistress } from '../../../lib/safety';
import { demoChatReply, hasSupabaseConfig } from '../../../lib/demo-mode';

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
  const body = await request.json() as {
    session_id?: string;
    speaker?: 'learner' | 'parent';
    text?: string;
    lang?: 'en' | 'te' | 'hi';
  };

  if (!hasSupabaseConfig()) {
    return NextResponse.json(demoChatReply(body.text || '', body.lang || 'en'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!enforceRateLimit(`chat:${user.id}`, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const requestBody = body as {
    session_id?: string;
    speaker?: 'learner' | 'parent';
    text?: string;
    lang?: 'en' | 'te' | 'hi';
  };
  if (!requestBody.session_id || !requestBody.text || !requestBody.speaker || !requestBody.lang || requestBody.text.length > 1000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, owner_id, state, district, lang, selected_trade_id, concern_state, trades(name_en)')
    .eq('id', requestBody.session_id)
    .eq('owner_id', user.id)
    .single();
  if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', requestBody.session_id);
  if ((count || 0) >= MAX_MESSAGES_PER_SESSION) {
    return NextResponse.json({ error: 'Session message limit reached', code: 'SESSION_CAP' }, { status: 429 });
  }

  const { data: familyMessage, error: insertError } = await supabase.from('messages').insert({
    session_id: requestBody.session_id,
    speaker: requestBody.speaker,
    text: requestBody.text,
    lang: requestBody.lang,
  }).select('id').single();
  if (insertError) return NextResponse.json({ error: 'Could not save message' }, { status: 500 });

  if (familyMessage) {
    try {
      const analysis = analyseMessage(requestBody.text);
      await createSupabaseAdminClient().from('message_analysis').insert({
        message_id: familyMessage.id,
        objection_category: analysis.objection,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
      });
    } catch (error) {
      console.error('message analysis write failed', error);
    }
  }

  const classification = classifyConcerns(requestBody.text);
  const concernState = updateConcernState(session.concern_state as Partial<ConcernState> | null, classification);
  await supabase.from('sessions').update({ concern_state: concernState }).eq('id', session.id).eq('owner_id', user.id);

  if (detectsDistress(requestBody.text)) {
    const { error: distressError } = await supabase.rpc('raise_distress', { p_session: session.id });
    if (distressError) console.error('distress escalation failed', distressError);
    await supabase.from('sessions').update({
      concern_state: updateConcernState(concernState, classification, [], 'escalated'),
    }).eq('id', session.id).eq('owner_id', user.id);
    return NextResponse.json({
      reply: crisisReply(requestBody.lang),
      citations: [],
      suggested_chips: [],
      escalate: true,
      escalate_reason: 'distress_signal',
      priority: 'urgent',
    });
  }

  let outcomes: VerifiedOutcome | null = null;
  let evidenceMetrics: EvidenceMetric[] = [];
  let evidence = assessEvidence(evidenceMetrics);
  if (session.selected_trade_id) {
    const { data: metricRows } = await supabase
      .from('outcome_metrics')
      .select('district, state, metric_key, metric_value, metric_text, unit, sample_size, year, verification_date, verification_status, is_synthetic, data_sources(publisher, title, source_url, document_reference)')
      .eq('trade_id', session.selected_trade_id)
      .eq('state', session.state)
      .eq('district', session.district)
      .eq('verification_status', 'verified')
      .eq('is_synthetic', false)
      .order('year', { ascending: false });
    if (metricRows?.length) {
      const values = Object.fromEntries(metricRows.map((row: any) => [row.metric_key, row.metric_value ?? row.metric_text]));
      const latest = metricRows[0] as any;
      const source = latest.data_sources;
      evidenceMetrics = metricRows as EvidenceMetric[];
      outcomes = {
        district: latest.district,
        state: latest.state,
        placement_rate: values.placement_rate ?? null,
        avg_start_salary_inr: values.starting_earnings ?? null,
        salary_3yr_min: null,
        salary_3yr_max: null,
        sample_size: latest.sample_size ?? 0,
        cohort_year: latest.year,
        source: source?.publisher ? `${source.publisher}: ${source.title}` : 'Source reference unavailable',
        verified_on: latest.verification_date,
        verified: true,
        is_synthetic: false,
        evidence_url: source?.source_url ?? null,
        scope: 'district',
      };
    }

    evidence = assessEvidence(evidenceMetrics);
    await supabase.from('sessions').update({
      concern_state: updateConcernState(concernState, classification, evidence.citations),
    }).eq('id', session.id).eq('owner_id', user.id);
    if (session.selected_trade_id && requestBody.text && requiresQuantitativeEvidence(requestBody.text) && !evidence.usable) {
      const reason = evidence.reason;
      const reply = reason === 'conflicting_verified_data'
        ? 'Verified sources give conflicting figures for this question. I will not choose one number without a counsellor reviewing the sources.'
        : 'Verified information is unavailable for this question. I can connect you with a human counsellor.';
      await supabase.from('escalations').insert({
        session_id: session.id,
        reason,
        status: 'new',
        priority: 'high',
        language: session.lang,
        district: session.district,
      });
        await supabase.from('sessions').update({
          concern_state: updateConcernState(concernState, classification, evidence.citations, 'escalated'),
        }).eq('id', session.id).eq('owner_id', user.id);
      return NextResponse.json({
        reply,
        citations: evidence.citations,
        suggested_chips: ['Talk to a counsellor'],
        escalate: true,
        escalate_reason: reason,
      });
    }
  }

  try {
    const provider = new GeminiProvider();
    const result = await provider.generate({
      language: requestBody.lang,
      speaker: requestBody.speaker,
      userMessage: redactPersonalData(requestBody.text),
      location: { state: session.state, district: session.district },
      tradeName: (session.trades as { name_en?: string } | null)?.name_en,
      verifiedOutcomes: outcomes,
      verifiedEvidence: evidence.metrics,
    });

    const { error: aiMessageError } = await createSupabaseAdminClient().from('messages').insert({
      session_id: requestBody.session_id,
      speaker: 'ai',
      text: result.text,
      lang: requestBody.lang,
    });
    if (aiMessageError) throw aiMessageError;

    const unsupported = validateGeneratedNumbers(result.text, evidence);
    if (unsupported.length) {
      await supabase.from('escalations').insert({
        session_id: session.id,
        reason: 'unsupported_numeric_claim',
        status: 'new',
        priority: 'high',
        language: session.lang,
        district: session.district,
      });
      return NextResponse.json({
        reply: 'I could not verify every number in that response. I will connect you with a counsellor rather than provide an unsupported statistic.',
        citations: evidence.citations,
        suggested_chips: ['Talk to a counsellor'],
        escalate: true,
        escalate_reason: 'unsupported_numeric_claim',
      });
    }
    return NextResponse.json({
      reply: result.text,
      citations: evidence.citations,
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
