import { hasLocale } from 'next-intl';
import { getLlmsIndex } from '@/lib/optimizely/get-llms-index';
import { getSiteSettings } from '@/lib/optimizely/get-site-settings';
import { renderLocaleLlms } from '@/lib/llms-render';
import { routing } from '@/i18n/routing';

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=3600',
};

export async function GET(_request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale } = await context.params;
  if (!hasLocale(routing.locales, locale)) {
    return new Response('Not found', { status: 404 });
  }
  const [entries, siteSettings] = await Promise.all([
    getLlmsIndex(),
    getSiteSettings(locale),
  ]);
  const body = renderLocaleLlms(locale, entries, siteSettings);
  return new Response(body, { headers: TEXT_HEADERS });
}
