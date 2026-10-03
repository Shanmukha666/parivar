import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ticketId = parseInt(params.id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('escalations')
    .update({
      status: 'assigned',
      counsellor_id: user?.id || null,
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
