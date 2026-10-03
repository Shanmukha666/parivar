import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { enforceRateLimit } from '../../../lib/rate-limit';

const DISTRICTS = new Set(['Adilabad', 'Karimnagar', 'Hyderabad']);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  if (!enforceRateLimit(`session:${user.id}`, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const body = await request.json();
  if (!['en', 'hi', 'te', 'ta'].includes(body.lang) || body.state !== 'Telangana' || !DISTRICTS.has(body.district) || body.consent !== true) {
    return NextResponse.json({ error: 'Unsupported location, language, or consent' }, { status: 400 });
  }

  const { data, error } = await supabase.from('sessions').insert({
    owner_id: user.id,
    lang: body.lang,
    state: body.state,
    district: body.district,
    user_role: body.user_role,
    learner_class: body.learner_class,
    income_bracket: body.income_bracket,
    selected_trade_id: body.selected_trade_id || null,
    consent: true,
    consent_version: body.consent_version || 'v1',
    consented_at: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: 'Could not create session' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
