import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaffRole } from './access';

export type Authz =
  | { ok: true; userId: string; roles: StaffRole[] }
  | { ok: false; response: NextResponse };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

/** Server-side role check for API routes. RLS stays the real enforcement; this gives clean 401/403s. */
export async function authorize(supabase: SupabaseClient | null, allowed: StaffRole[]): Promise<Authz> {
  if (!supabase) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };

  const { data } = await supabase.from('staff_roles').select('role');
  const roles = (data ?? []).map(r => r.role).filter((r): r is StaffRole => r === 'admin' || r === 'counsellor');
  if (!roles.some(r => allowed.includes(r))) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: user.id, roles };
}

/** Never leak constraint / policy names to the browser. Log server-side, return a stable code. */
export function fail(status: number, code: string, detail?: unknown) {
  if (detail) console.error(`[api] ${code}`, detail);
  return NextResponse.json({ error: code }, { status });
}
