import { getLlmsIndex } from '@/lib/optimizely/get-llms-index';
import { getSiteSettings } from '@/lib/optimizely/get-site-settings';
import { renderRootLlms } from '@/lib/llms-render';
import { routing } from '@/i18n/routing';

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=3600',
};

export async function GET() {
  const [entries, siteSettings] = await Promise.all([
    getLlmsIndex(),
    getSiteSettings(routing.defaultLocale),
  ]);
  const body = renderRootLlms(entries, siteSettings);
  return new Response(body, { headers: TEXT_HEADERS });
}
