import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAdmin } from '../../../../lib/authorization';

const CONCERNS = [
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

type CountMap = Record<string, number>;

function increment(target: CountMap, key: string | null | undefined) {
  if (key) target[key] = (target[key] || 0) + 1;
}

function hasDate(value: string | null, start: string | null, end: string | null) {
  if (!value) return false;
  const date = new Date(value).getTime();
  if (start && date < new Date(`${start}T00:00:00.000Z`).getTime()) return false;
  if (end && date >= new Date(`${end}T23:59:59.999Z`).getTime()) return false;
  return true;
}

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const district = searchParams.get('district');
  const language = searchParams.get('language');
  const tradeId = searchParams.get('trade_id');
  const providerId = searchParams.get('provider_id');
  const concern = searchParams.get('concern');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let sessionQuery = supabase
    .from('sessions')
    .select('id, state, district, lang, selected_trade_id, created_at, concern_state')
    .order('created_at', { ascending: true });
  if (state) sessionQuery = sessionQuery.eq('state', state);
  if (district) sessionQuery = sessionQuery.eq('district', district);
  if (language) sessionQuery = sessionQuery.eq('lang', language);
  if (tradeId) sessionQuery = sessionQuery.eq('selected_trade_id', Number(tradeId));
  if (startDate) sessionQuery = sessionQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
  if (endDate) sessionQuery = sessionQuery.lte('created_at', `${endDate}T23:59:59.999Z`);

  const { data: rawSessions, error: sessionsError } = await sessionQuery;
  if (sessionsError) return NextResponse.json({ error: 'Failed to fetch aggregate session data' }, { status: 500 });

  const sessions = (rawSessions || []).filter((item) => hasDate(item.created_at, startDate, endDate));
  const sessionIds = sessions.map((item) => item.id);
  const sessionSet = new Set(sessionIds);

  const [tradesResult, escalationsResult, messagesResult, metricsResult] = await Promise.all([
    supabase.from('trades').select('id, name_en'),
    sessionIds.length
      ? supabase.from('escalations').select('session_id, status').in('session_id', sessionIds)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length
      ? supabase.from('messages').select('id, session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('outcome_metrics').select('provider_id, trade_id, state, district, verification_status, is_synthetic'),
  ]);

  if (tradesResult.error || escalationsResult.error || messagesResult.error || metricsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard aggregates' }, { status: 500 });
  }

  const tradeNames = new Map((tradesResult.data || []).map((trade) => [trade.id, trade.name_en]));
  const relevantEscalations = (escalationsResult.data || []).filter((item) => sessionSet.has(item.session_id));
  const messageIds = (messagesResult.data || []).map((item) => item.id);
  const messageSession = new Map((messagesResult.data || []).map((item) => [item.id, item.session_id]));
  const analysesResult = messageIds.length
    ? await supabase.from('message_analysis').select('message_id, concerns, objection_category').in('message_id', messageIds)
    : { data: [], error: null };
  if (analysesResult.error) return NextResponse.json({ error: 'Failed to fetch concern aggregates' }, { status: 500 });

  const concernDistribution: CountMap = {};
  const legacyConcernMap: Record<string, string> = {
    income: 'income_potential',
    job_security: 'job_security',
    status: 'social_perception_status',
    degree_pref: 'further_education',
    safety: 'safety',
    cost: 'family_affordability',
  };
  const concernSessionIds = new Set<string>();
  for (const analysis of analysesResult.data || []) {
    const concerns = Array.isArray(analysis.concerns) ? analysis.concerns : [];
    const labels = concerns.length
      ? concerns
      : [legacyConcernMap[analysis.objection_category || ''] || analysis.objection_category];
    for (const label of labels) {
      if (label && CONCERNS.includes(label as typeof CONCERNS[number])) {
        increment(concernDistribution, label);
        const sid = messageSession.get(analysis.message_id);
        if (sid) concernSessionIds.add(`${sid}:${label}`);
      }
    }
  }
  if (concern && concern !== 'all') {
    for (const key of Object.keys(concernDistribution)) {
      if (key !== concern) delete concernDistribution[key];
    }
  }

  const providerScopedSessionIds = providerId
    ? new Set((metricsResult.data || [])
      .filter((metric) => String(metric.provider_id) === providerId && metric.verification_status === 'verified' && metric.is_synthetic === false)
      .flatMap((metric) => sessions
        .filter((session) =>
          session.selected_trade_id === metric.trade_id &&
          session.state === metric.state &&
          (!metric.district || session.district === metric.district),
        )
        .map((session) => session.id)))
    : null;
  const filteredSessions = concern && concern !== 'all'
    ? sessions.filter((session) => concernSessionIds.has(`${session.id}:${concern}`))
    : sessions;
  const providerFilteredSessions = providerScopedSessionIds
    ? filteredSessions.filter((session) => providerScopedSessionIds.has(session.id))
    : filteredSessions;
  const filteredIds = new Set(providerFilteredSessions.map((session) => session.id));
  const filteredEscalations = relevantEscalations.filter((item) => filteredIds.has(item.session_id));

  const geography: CountMap = {};
  const tradeDistribution: CountMap = {};
  const languageDistribution: CountMap = {};
  const unresolvedByConcern: CountMap = {};
  const concernChanges: CountMap = { resolved: 0, unresolved: 0 };

  for (const session of providerFilteredSessions) {
    increment(geography, `${session.state || 'Unknown'} / ${session.district || 'Unknown'}`);
    increment(tradeDistribution, tradeNames.get(session.selected_trade_id) || 'Not specified');
    increment(languageDistribution, session.lang || 'Unknown');
    const state = session.concern_state || {};
    const unresolved = Array.isArray(state.unresolved_concerns) ? state.unresolved_concerns : [];
    const current = Array.isArray(state.current_concerns) ? state.current_concerns : [];
    if (unresolved.length) concernChanges.unresolved++;
    else if (current.length || Array.isArray(state.initial_concerns) && state.initial_concerns.length) concernChanges.resolved++;
    for (const label of unresolved) increment(unresolvedByConcern, label);
  }

  const providerDistribution: CountMap = {};
  const providerIds = (metricsResult.data || [])
    .filter((metric) => metric.verification_status === 'verified' && metric.is_synthetic === false)
    .filter((metric) => filteredSessions.some((session) =>
      session.selected_trade_id === metric.trade_id &&
      session.state === metric.state &&
      (!metric.district || session.district === metric.district),
    ))
    .map((metric) => metric.provider_id)
    .filter((id): id is number => Number.isInteger(id));
  const uniqueProviderIds = Array.from(new Set(providerIds));
  if (uniqueProviderIds.length) {
    let providersQuery = supabase.from('providers').select('id, name').in('id', uniqueProviderIds);
    if (providerId) providersQuery = providersQuery.eq('id', Number(providerId));
    const providersResult = await providersQuery;
    if (providersResult.error) return NextResponse.json({ error: 'Failed to fetch provider aggregates' }, { status: 500 });
    for (const provider of providersResult.data || []) increment(providerDistribution, provider.name);
  }

  const total = providerFilteredSessions.length;
  const escalated = filteredEscalations.length;
  const unresolved = concernChanges.unresolved;
  return NextResponse.json({
    filters: { state, district, language, trade_id: tradeId, provider_id: providerId, concern, start_date: startDate, end_date: endDate },
    kpis: {
      counselling_volume: total,
      unresolved_concerns: unresolved,
      escalation_rate: total ? escalated / total : null,
      escalation_rate_label: total ? `${Math.round((escalated / total) * 100)}%` : 'Insufficient data',
    },
    concern_distribution: concernDistribution,
    unresolved_concerns_by_category: unresolvedByConcern,
    concern_state_change: {
      resolved: concernChanges.resolved || null,
      unresolved: concernChanges.unresolved || null,
      label: total ? 'Based on recorded Concern State' : 'Insufficient data',
    },
    geographic_distribution: geography,
    trade_distribution: tradeDistribution,
    language_distribution: languageDistribution,
    provider_distribution: providerDistribution,
    insufficient_data: total === 0,
  });
}
