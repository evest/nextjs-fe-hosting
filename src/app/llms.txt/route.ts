import { getLlmsIndex } from '@/lib/optimizely/get-llms-index';
import { getSiteSettings } from '@/lib/optimizely/get-site-settings';
import { renderRootLlms, ROOT_LLMS_LOCALE } from '@/lib/llms-render';

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=3600',
};

export async function GET() {
  // The root /llms.txt is the locale-agnostic entry point — its header uses the
  // international default (English) regardless of routing.defaultLocale, so the
  // site name/description read in English. Per-locale routes (/no/llms.txt) use
  // their own locale.
  const [entries, siteSettings] = await Promise.all([
    getLlmsIndex(),
    getSiteSettings(ROOT_LLMS_LOCALE),
  ]);
  const body = renderRootLlms(entries, siteSettings);
  return new Response(body, { headers: TEXT_HEADERS });
}
