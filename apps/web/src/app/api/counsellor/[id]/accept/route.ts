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

  const { data, error } = await supabase
    .from('escalations')
    .update({
      status: 'assigned',
      counsellor_id: user.id,
    })
    .eq('id', ticketId)
    .eq('status', 'new')
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
