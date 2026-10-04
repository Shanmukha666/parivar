import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { authorize, fail } from '../../../../lib/guard';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const auth = await authorize(supabase, ['admin']);
  if (!auth.ok) return auth.response;

  const query = new URL(request.url).searchParams;
  const cleanText = (value: string | null) => value && /^[A-Za-z .'-]{1,60}$/.test(value) ? value : null;
  const state = cleanText(query.get('state'));
  const district = cleanText(query.get('district'));
  const rawTrade = Number(query.get('trade_id'));
  const tradeId = Number.isSafeInteger(rawTrade) && rawTrade > 0 ? rawTrade : null;

  const [kpis, heatmap, objections] = await Promise.all([
    supabase.rpc('admin_kpis', { p_state: state, p_district: district, p_trade_id: tradeId }),
    supabase.rpc('admin_district_resistance', { p_state: state }),
    supabase.rpc('admin_objection_breakdown', { p_district: district }),
  ]);
  if (kpis.error || heatmap.error || objections.error) {
    return fail(503, 'metrics_unavailable', kpis.error || heatmap.error || objections.error);
  }

  const aggregate = (kpis.data || {}) as Record<string, any>;
  const total = Number(aggregate.total_sessions || 0);
  return NextResponse.json({
    ...aggregate,
    objections: objections.data || {},
    heatmap: heatmap.data || [],
    kpis: {
      counselling_volume: total,
      unresolved_concerns: null,
      escalation_rate: aggregate.escalation_rate ?? null,
      escalation_rate_label: total ? `${Math.round(Number(aggregate.escalation_rate || 0) * 100)}%` : 'Insufficient data',
    },
    concern_distribution: objections.data || {},
    unresolved_concerns_by_category: {},
    concern_state_change: { resolved: null, unresolved: null, label: 'Aggregate concern-state data unavailable' },
    geographic_distribution: {},
    trade_distribution: {},
    language_distribution: {},
    provider_distribution: {},
    insufficient_data: total === 0,
  });
}
