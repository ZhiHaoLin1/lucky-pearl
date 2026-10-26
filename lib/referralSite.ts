import { NextResponse } from 'next/server';
import { REFERRAL_BASE_URL } from './referrals';

// The referral site (referral.luckypearl.app) and the main site (www.luckypearl.app) are the same
// "site" to a browser (same registrable domain), so the referral page can call the main site's
// sign-up API directly and the login cookie is set on the main site, ready for the dashboard.

/** Where the main site lives, as seen from a referral-site host header. */
export function mainSiteUrlForHost(host: string): string {
  if (!host.startsWith('referral.')) return ''; // same host (local testing)
  const rest = host.slice('referral.'.length);
  return rest.startsWith('localhost') ? `http://${rest}` : `https://www.${rest}`;
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (origin === new URL(REFERRAL_BASE_URL).origin) return origin;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/referral\.localhost:\d+$/.test(origin)) return origin;
  return null;
}

/** True when the request was made by a page on the referral site. */
export function isFromReferralSite(request: Request): boolean {
  return allowedOrigin(request) !== null;
}

/** Adds CORS headers so only the referral site may call this endpoint with the visitor's cookies. */
export function withReferralCors(request: Request, response: NextResponse): NextResponse {
  const origin = allowedOrigin(request);
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export function referralPreflight(request: Request): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  const origin = allowedOrigin(request);
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '600');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}
