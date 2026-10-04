import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';
import { authorize, fail } from '../../../../lib/guard';
import { buildInsights, type HeatRow, type Kpis } from '../../../../lib/insights';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const auth = await authorize(supabase, ['admin']);
  if (!auth.ok) return auth.response;

  const query = new URL(request.url).searchParams;
  const state = query.get('state');
  const district = query.get('district');
  const [kpis, heatmap, objections] = await Promise.all([
    supabase.rpc('admin_kpis', { p_state: state, p_district: district, p_trade_id: null }),
    supabase.rpc('admin_district_resistance', { p_state: state }),
    supabase.rpc('admin_objection_breakdown', { p_district: district }),
  ]);
  if (kpis.error || heatmap.error || objections.error) {
    return fail(503, 'insights_unavailable', kpis.error || heatmap.error || objections.error);
  }
  return NextResponse.json(buildInsights(kpis.data as Kpis, (heatmap.data || []) as HeatRow[], (objections.data || {}) as Record<string, number>));
}
