import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except API/CMS hooks, Next internals, static assets,
  // and routes that intentionally live outside the locale tree.
  matcher: [
    '/((?!api|hooks|debug|diagnostics|preview|_next|_vercel|.*\\..*).*)',
  ],
};
