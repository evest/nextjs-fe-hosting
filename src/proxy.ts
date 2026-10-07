import { createHash, timingSafeEqual } from 'node:crypto';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/diagnostics')) {
    return guardDiagnostics(request);
  }
  return intlMiddleware(request);
}

// /diagnostics/* is developer tooling: HTTP Basic Auth with credentials from
// DIAGNOSTICS_USER / DIAGNOSTICS_PASSWORD (PaaS Portal > App Settings on
// Frontend Hosting, .env locally). Closed by default: if either variable is
// missing, the whole section 404s, so a new environment never exposes it.
function guardDiagnostics(request: NextRequest) {
  const user = process.env.DIAGNOSTICS_USER;
  const password = process.env.DIAGNOSTICS_PASSWORD;
  if (!user || !password) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (!hasValidCredentials(request.headers.get('authorization'), user, password)) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Diagnostics", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

function hasValidCredentials(header: string | null, user: string, password: string): boolean {
  if (!header?.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  // Compare both parts, always, in constant time (hashing equalises lengths).
  const userOk = safeEqual(decoded.slice(0, separator), user);
  const passwordOk = safeEqual(decoded.slice(separator + 1), password);
  return userOk && passwordOk;
}

function safeEqual(a: string, b: string): boolean {
  const hash = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export const config = {
  // Match all paths except API/CMS hooks, Next internals, static assets,
  // and the preview route, which lives outside the locale tree.
  // /diagnostics is matched so the auth guard above runs; it bypasses the
  // locale middleware.
  matcher: [
    '/((?!api|hooks|preview|_next|_vercel|.*\\..*).*)',
  ],
};
