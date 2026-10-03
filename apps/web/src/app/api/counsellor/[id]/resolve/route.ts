import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const ticketId = parseInt(params.id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const resolutionNote = body.resolution_note || 'Resolved by counsellor';

  const { data, error } = await supabase
    .from('escalations')
    .update({
      status: 'resolved',
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
