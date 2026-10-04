import { createBrowserClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import { hasSupabaseConfig } from './demo-mode';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = hasSupabaseConfig() && url && key
  ? createBrowserClient(url, key)
  : null;

export async function ensureFamilySession(): Promise<Session> {
  if (!supabase) {
    // Graceful offline/demo fallback when Supabase keys are not provided
    return {
      access_token: 'local-demo-token',
      token_type: 'bearer',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    } as unknown as Session;
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
