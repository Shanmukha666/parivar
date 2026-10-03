import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json().catch(() => ({}));

  if (!body.session_id || !body.text) {
    return NextResponse.json({ error: 'session_id and text are required' }, { status: 400 });
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
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
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
