import { NextResponse, type NextRequest } from 'next/server';

// referral.luckypearl.app is the separate, campaign-tracking landing site. It runs from
// the same app, so on that host every page request is served from the /referral folder
// (API calls and static files are left alone).
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  if (!host.startsWith('referral.')) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api') || pathname.startsWith('/referral')) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/referral' : `/referral${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
