import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key
  ? createBrowserClient(url, key)
  : null;

export async function ensureFamilySession(): Promise<Session> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data: existing, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (existing.session) return existing.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    throw error ?? new Error('Supabase did not return a family session');
  }
  return data.session;
}
