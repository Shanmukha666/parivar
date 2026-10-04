import { createClient } from '@supabase/supabase-js';

// SERVER ONLY. Used by API routes for the few writes users must not make themselves
// (AI replies, classifier output). Never import this from a component or a 'use client' file,
// and never give the key a NEXT_PUBLIC_ prefix.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
