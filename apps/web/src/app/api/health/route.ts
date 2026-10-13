import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { enforceRateLimit } from '../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Rate-limit: max 10 health checks per minute per IP/client
  const forwardedFor = request.headers.get('x-forwarded-for') || 'local';
  if (!enforceRateLimit(`health:${forwardedFor}`, 10)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const isDemo =
    process.env.PARIVAR_DEMO_MODE === 'true' ||
    process.env.NEXT_PUBLIC_PARIVAR_DEMO_MODE === 'true' ||
    process.env.NEXT_PUBLIC_FORCE_DEMO_MODE === 'true';

  let supabaseOk = false;
  let geminiOk = false;

  // 1. Supabase Check
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('trades').select('id').limit(1);
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }

  // 2. Gemini Check (API key in request header ONLY, never query string)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
      const pingRes = await fetch(endpoint, {
        headers: { 'x-goog-api-key': geminiKey },
        signal: AbortSignal.timeout(3000),
      });
      geminiOk = pingRes.ok;
    } catch {
      geminiOk = false;
    }
  }

  const isHealthy = isDemo || (supabaseOk && (geminiOk || !geminiKey));

  // Safe, non-sensitive public health status
  const publicReport: Record<string, unknown> = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    mode: isDemo ? 'demo' : 'production',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseOk ? 'connected' : (isDemo ? 'offline_demo_fallback' : 'unreachable'),
      gemini: geminiKey ? (geminiOk ? 'connected' : 'degraded') : 'unconfigured',
    },
  };

  return NextResponse.json(publicReport, {
    status: isHealthy ? 200 : 503,
  });
}

