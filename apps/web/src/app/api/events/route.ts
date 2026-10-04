import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { isUuid, fail } from '../../../lib/guard';

// Funnel events feed the admin dashboard. The database accepts only these four types.
const TYPES = new Set(['trade_viewed', 'summary_viewed', 'summary_shared', 'voice_used']);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, 'auth_required');
  const b = await request.json().catch(() => null) as { session_id?: unknown; type?: unknown } | null;
  if (!b || !isUuid(b.session_id) || typeof b.type !== 'string' || !TYPES.has(b.type)) return fail(400, 'invalid_event');
  const { error } = await supabase.from('events').insert({ session_id: b.session_id, type: b.type });
  if (error) return fail(400, 'event_rejected', error);
  return NextResponse.json({ ok: true }, { status: 201 });
}
