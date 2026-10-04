// Pure access-control decision used by middleware.ts (kept pure so it can be unit-tested).
//
// The original middleware redirected unauthorised users to /admin or /counsellor, but those
// are the LOGIN pages and were matched by the same middleware, so every unauthenticated
// request produced an infinite redirect (ERR_TOO_MANY_REDIRECTS). Login pages are now exempt.
export type StaffRole = 'admin' | 'counsellor';
export type AccessDecision = { action: 'allow' } | { action: 'redirect'; to: string };

const LOGIN_PAGES = new Set(['/admin', '/counsellor']);

function normalise(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

export function isStaffArea(pathname: string) {
  const p = normalise(pathname);
  return p === '/admin' || p.startsWith('/admin/') || p === '/counsellor' || p.startsWith('/counsellor/');
}

export function isLoginPage(pathname: string) {
  return LOGIN_PAGES.has(normalise(pathname));
}

export function decideAccess(pathname: string, roles: readonly StaffRole[]): AccessDecision {
  const p = normalise(pathname);
  if (!isStaffArea(p) || isLoginPage(p)) return { action: 'allow' };

  const held = new Set(roles);
  const inAdmin = p.startsWith('/admin/');
  const permitted = inAdmin ? held.has('admin') : held.has('counsellor') || held.has('admin');
  if (permitted) return { action: 'allow' };

  // Signed in but wrong role -> home (never back into a gated area, which would loop).
  // Not signed in -> the matching login page, which is exempt above.
  if (held.size > 0) return { action: 'redirect', to: '/' };
  return { action: 'redirect', to: inAdmin ? '/admin' : '/counsellor' };
}
