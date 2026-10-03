import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase-server';

export type StaffRole = 'admin' | 'counsellor';

export async function getAuthenticatedUser(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    return { supabase, user: null };
  }
  return { supabase, user };
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
