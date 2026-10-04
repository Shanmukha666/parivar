import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { demoSessionResponse, hasSupabaseConfig } from '../../../lib/demo-mode';

const DISTRICTS = new Set(['Warangal', 'Adilabad', 'Karimnagar', 'Hyderabad']);

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    const body = await request.json();
    if (!['en', 'hi', 'te', 'ta'].includes(body.lang) || body.state !== 'Telangana' || !DISTRICTS.has(body.district) || body.consent !== true) {
      return NextResponse.json({ error: 'Unsupported location, language, or consent' }, { status: 400 });
    }
    return NextResponse.json(demoSessionResponse(body), { status: 201 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is not authenticated, proxy to FastAPI backend for anonymous sessions
  if (!user) {
    const body = await request.json();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const backendRes = await fetch(`${backendUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: 201 });
      }
    } catch { /* fall through to demo */ }
    return NextResponse.json(demoSessionResponse(body), { status: 201 });
  }

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
