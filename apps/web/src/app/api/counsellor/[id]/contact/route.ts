import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '../../../../../lib/authorization';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, user } = await getAuthenticatedUser();
  const denied = requireRole(user, 'counsellor');
  if (denied) return denied;

  const ticketId = Number.parseInt(params.id, 10);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('escalations')
    .update({ status: 'contacted', contacted_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('counsellor_id', user!.id)
    .eq('status', 'assigned')
    .select(`
      id, session_id, status, contacted_at,
      escalation_contacts ( callback_phone )
    `)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Ticket is not assigned to you' }, { status: error ? 500 : 409 });
  }
  return NextResponse.json(data);
}
