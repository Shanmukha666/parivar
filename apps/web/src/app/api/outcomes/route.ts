import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { demoOutcomeResponse, hasSupabaseConfig } from '../../../lib/demo-mode';

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(demoOutcomeResponse());
  }

  const supabase = await createSupabaseServerClient();
  const params = new URL(request.url).searchParams;
  const tradeId = params.get('trade_id');
  const providerId = params.get('provider_id');
  const state = params.get('state');
  const district = params.get('district');
  const includeDemo = params.get('include_demo') === 'true';

  let query = supabase
    .from('outcome_metrics')
    .select('*, data_sources(*)')
    .order('year', { ascending: false })
    .order('id', { ascending: false });
  if (tradeId) query = query.eq('trade_id', tradeId);
  if (providerId) query = query.eq('provider_id', providerId);
  if (state) query = query.eq('state', state);
  if (district) query = query.eq('district', district);
  if (!includeDemo) {
    query = query.eq('verification_status', 'verified').eq('is_synthetic', false);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Outcome data unavailable' }, { status: 500 });

  const staleBefore = new Date();
  staleBefore.setDate(staleBefore.getDate() - 730);
  return NextResponse.json((data || []).map((metric: any) => ({
    ...metric,
    stale: Boolean(metric.verification_date && new Date(metric.verification_date) < staleBefore),
    source: metric.data_sources ? {
      publisher: metric.data_sources.publisher,
      title: metric.data_sources.title,
      url: metric.data_sources.source_url,
      document_reference: metric.data_sources.document_reference,
    } : null,
    data_sources: undefined,
  })));
}
