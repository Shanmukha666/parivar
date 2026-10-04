import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '../../../../lib/authorization';

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireRole(user, 'counsellor');
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.app_metadata?.role === 'admin') return NextResponse.json({ error: 'Raw transcripts are restricted to the assigned counsellor' }, { status: 403 });
  const body = await request.json().catch(() => ({}));

  if (!body.session_id || !body.text) {
    return NextResponse.json({ error: 'session_id and text are required' }, { status: 400 });
  }

  if (user.app_metadata?.role !== 'admin') {
    const { data: assignment } = await supabase
      .from('escalations')
      .select('id')
      .eq('session_id', body.session_id)
      .eq('counsellor_id', user.id)
      .in('status', ['assigned', 'contacted'])
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Ticket is not assigned to this counsellor' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_id: body.session_id,
      speaker: 'counsellor',
      text: body.text,
      lang: body.lang || 'en',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireRole(user, 'counsellor');
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.app_metadata?.role === 'admin') return NextResponse.json({ error: 'Raw transcripts are restricted to the assigned counsellor' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  if (user.app_metadata?.role !== 'admin') {
    const { data: assignment } = await supabase
      .from('escalations')
      .select('id')
      .eq('session_id', sessionId)
      .eq('counsellor_id', user.id)
      .in('status', ['assigned', 'contacted'])
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Ticket is not assigned to this counsellor' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, session_id, speaker, text, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
