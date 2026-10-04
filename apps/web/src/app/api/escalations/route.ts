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

  // The SECURITY DEFINER RPC checks ownership and atomically creates the
  // contact, preventing clients from forging status, assignee, or SLA values.
  const { data: escalationId, error } = await supabase.rpc('create_escalation', {
    p_session: session.id,
    p_reason: body.reason,
    p_priority: body.priority === 'high' ? 'high' : 'normal',
    p_slot: body.callback_slot || null,
    p_phone: body.callback_phone || null,
    p_phone_consent: Boolean(body.callback_phone_consent),
  });
  if (error || !escalationId) {
    const status = error?.message.includes('ticket_already_open') ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? 'An open escalation already exists' : 'Could not create escalation' }, { status });
  }

  return NextResponse.json({ id: escalationId, status: 'new' }, { status: 201 });
}
