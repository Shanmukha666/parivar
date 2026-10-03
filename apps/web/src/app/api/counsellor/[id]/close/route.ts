import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '../../../../../lib/authorization';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireRole(user, 'counsellor');
  if (denied) return denied;

  const ticketId = Number.parseInt(params.id, 10);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const resolutionNote = typeof body.resolution_note === 'string' ? body.resolution_note.trim() : '';
  if (!resolutionNote || resolutionNote.length > 2000) {
    return NextResponse.json({ error: 'A resolution note is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('escalations')
    .update({
      status: 'closed_no_response',
      resolution_note: resolutionNote,
      closed_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('counsellor_id', user!.id)
    .eq('status', 'resolved')
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Ticket must be resolved first' }, { status: error ? 500 : 409 });
  }
  return NextResponse.json(data);
}
