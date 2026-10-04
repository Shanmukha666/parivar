import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase-server';

export type StaffRole = 'admin' | 'counsellor';

export async function getAuthenticatedUser(): Promise<{
  supabase: any;
  user: User | null;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { supabase: null as any, user: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null };
  }

  // `app_metadata` is not the database authorization source. The policies use
  // `staff_roles`, so API checks must use the same, RLS-scoped relation.
  const { data: staffRows } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', user.id);
  const roles = (staffRows || []).map((row: any) => row.role);
  const role = roles.includes('admin') ? 'admin' : roles.includes('counsellor') ? 'counsellor' : undefined;
  return {
    supabase,
    user: { ...user, app_metadata: { ...user.app_metadata, ...(role ? { role } : {}) } },
  };
}

export function hasRole(user: User | null, role: StaffRole): boolean {
  return user?.app_metadata?.role === role;
}

export function isStaff(user: User | null): boolean {
  return hasRole(user, 'admin') || hasRole(user, 'counsellor');
}

export function requireRole(user: User | null, role: StaffRole): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!hasRole(user, role) && !(role === 'counsellor' && hasRole(user, 'admin'))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return null;
}

export function requireAdmin(user: User | null): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!hasRole(user, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return null;
}
