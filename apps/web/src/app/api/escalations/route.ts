import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { enforceRateLimit } from '../../../lib/rate-limit';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  if (!enforceRateLimit(`escalation:${user.id}`, 5)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const body = await request.json() as {
    session_id?: string;
    reason?: string;
    callback_phone?: string;
    callback_phone_consent?: boolean;
    callback_slot?: string;
    priority?: 'normal' | 'high' | 'urgent';
    concern_category?: string;
  };
  if (!body.session_id || !body.reason || body.reason.length > 1000) {
    return NextResponse.json({ error: 'Invalid escalation request' }, { status: 400 });
  }
  if (body.callback_phone && !body.callback_phone_consent) {
    return NextResponse.json({ error: 'Phone consent is required before storing a callback number' }, { status: 400 });
  }
  if (body.callback_phone && !/^[6-9]\d{9}$/.test(body.callback_phone)) {
    return NextResponse.json({ error: 'Invalid callback number' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('id, owner_id, lang, district')
    .eq('id', body.session_id)
    .eq('owner_id', user.id)
    .single();
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: escalation, error } = await supabase.from('escalations').insert({
    session_id: session.id,
    reason: body.reason,
    concern_category: body.concern_category || null,
    status: 'new',
    priority: body.priority || 'normal',
    language: session.lang,
    district: session.district,
    callback_slot: body.callback_slot || '10:00-18:00 Monday-Saturday',
    sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();
  if (error || !escalation) return NextResponse.json({ error: 'Could not create escalation' }, { status: 500 });

  if (body.callback_phone && body.callback_phone_consent) {
    const { error: contactError } = await supabase.from('escalation_contacts').insert({
      escalation_id: escalation.id,
      callback_phone: body.callback_phone,
      consented: true,
    });
    if (contactError) return NextResponse.json({ error: 'Escalation created but callback contact was not stored' }, { status: 500 });
  }

  return NextResponse.json({ id: escalation.id, status: escalation.status }, { status: 201 });
}
