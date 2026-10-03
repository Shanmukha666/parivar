import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase-server';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json();
  if (!Number.isInteger(body.selected_trade_id) || body.selected_trade_id <= 0) {
    return NextResponse.json({ error: 'Invalid trade' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sessions')
    .update({ selected_trade_id: body.selected_trade_id })
    .eq('id', context.params.id)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', context.params.id)
    .eq('owner_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not delete session' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
