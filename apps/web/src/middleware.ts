import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookies => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  const needsAdmin = request.nextUrl.pathname.startsWith('/admin');
  const needsCounsellor = request.nextUrl.pathname.startsWith('/counsellor');
  const allowed = needsAdmin ? role === 'admin' : needsCounsellor ? role === 'admin' || role === 'counsellor' : true;

  if ((needsAdmin || needsCounsellor) && !allowed) {
    return NextResponse.redirect(new URL(needsAdmin ? '/admin' : '/counsellor', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/counsellor/:path*'],
};
