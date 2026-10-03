import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

const QUESTIONS = ['preferred_trade', 'top_priority', 'preferred_location'] as const;
type Participant = 'learner' | 'parent';

function compare(learner: Record<string, string>, parent: Record<string, string>) {
  const agreements = QUESTIONS.filter(question =>
    learner[question]?.trim().toLocaleLowerCase() === parent[question]?.trim().toLocaleLowerCase(),
  );
  const disagreements = QUESTIONS.filter(question => !agreements.includes(question));
  return {
    agreements,
    disagreements,
    has_disagreement: disagreements.length > 0,
    neutral_language: true,
  };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json() as {
    session_id?: string;
    participant?: Participant;
    answers?: Record<string, string>;
    request_escalation?: boolean;
  };
  if (!body.session_id || !body.participant || !body.answers ||
      !['learner', 'parent'].includes(body.participant) ||
      Object.keys(body.answers).some(key => !QUESTIONS.includes(key as typeof QUESTIONS[number]))) {
    return NextResponse.json({ error: 'Invalid joint counselling answer' }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, owner_id, state, joint_counselling_state')
    .eq('id', body.session_id)
    .eq('owner_id', user.id)
    .single();
  if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const current = session.joint_counselling_state || { mode: 'joint', answers: {}, evidence_discussed: [] };
  const answers = Object.fromEntries(
    Object.entries(body.answers).filter(([, value]) => typeof value === 'string' && value.trim()),
  );
  const missing = QUESTIONS.filter(question => !answers[question]);
  const nextAnswers = { ...(current.answers || {}), [body.participant]: { ...(current.answers?.[body.participant] || {}), ...answers } };

  if (missing.length) {
    await supabase.from('sessions').update({
      joint_counselling_state: { ...current, mode: 'joint', status: 'incomplete', answers: nextAnswers },
    }).eq('id', session.id).eq('owner_id', user.id);
    return NextResponse.json({ status: 'incomplete', missing, revealed: false });
  }
  if (body.participant === 'learner' || !nextAnswers.learner) {
    const nextState = { ...current, mode: 'joint', status: 'awaiting_parent', answers: nextAnswers };
    await supabase.from('sessions').update({ joint_counselling_state: nextState }).eq('id', session.id).eq('owner_id', user.id);
    return NextResponse.json({ status: 'awaiting_parent', missing: [], revealed: false });
  }

  const comparison = compare(nextAnswers.learner, nextAnswers.parent);
  const tradeNames = [nextAnswers.learner.preferred_trade, nextAnswers.parent.preferred_trade];
  const { data: trades } = await supabase
    .from('trades')
    .select('id, name_en')
    .in('name_en', tradeNames);
  const tradeIds = (trades || []).map(trade => trade.id);
  const { data: evidenceRows } = tradeIds.length
    ? await supabase
      .from('outcome_metrics')
      .select('trade_id, metric_key, metric_value, metric_text, unit, year, verification_date, data_sources(publisher, title, source_url, document_reference)')
      .in('trade_id', tradeIds)
      .eq('state', session.state || '')
      .eq('verification_status', 'verified')
      .eq('is_synthetic', false)
    : { data: [] };
  const evidence = evidenceRows || [];
  const citations = evidence.map((row: any) => row.data_sources).filter(Boolean);
  const nextState = {
    ...current,
    mode: 'joint',
    status: 'compared',
    answers: nextAnswers,
    comparison,
    counselling_plan: {
      goal: 'Support an informed family discussion; the system does not decide for the family.',
      steps: comparison.disagreements.map(area => `Discuss the evidence for ${area.replaceAll('_', ' ')} together.`),
      decision_owner: 'family',
      avoid_blame: true,
    },
    unresolved: true,
    escalation_status: body.request_escalation ? 'pending' : (current.escalation_status || 'not_escalated'),
    evidence_discussed: citations,
  };
  await supabase.from('sessions').update({ joint_counselling_state: nextState }).eq('id', session.id).eq('owner_id', user.id);
  if (body.request_escalation) {
    await supabase.from('escalations').insert({
      session_id: session.id,
      reason: 'joint_counselling_requested',
      status: 'new',
      priority: 'high',
    });
  }
  return NextResponse.json({
    status: 'compared',
    missing: [],
    revealed: true,
    comparison,
    counselling_plan: nextState.counselling_plan,
    escalate: Boolean(body.request_escalation),
    evidence,
    citations,
  });
}
