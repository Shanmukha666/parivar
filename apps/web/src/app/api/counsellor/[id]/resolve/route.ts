import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '../../../../../lib/authorization';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireRole(user, 'counsellor');
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
    .eq('counsellor_id', user.id)
    .eq('status', 'contacted')
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Ticket must be contacted before resolution' }, { status: error ? 500 : 409 });
  }

  return NextResponse.json(data);
}
