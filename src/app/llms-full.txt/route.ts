import { getLlmsIndex } from '@/lib/optimizely/get-llms-index';
import { getSiteSettings } from '@/lib/optimizely/get-site-settings';
import { renderRootLlmsFull, ROOT_LLMS_LOCALE } from '@/lib/llms-render';

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=3600',
};

export async function GET() {
  // Root /llms-full.txt header uses the international default (English) — see
  // the note in llms.txt/route.ts.
  const [entries, siteSettings] = await Promise.all([
    getLlmsIndex(),
    getSiteSettings(ROOT_LLMS_LOCALE),
  ]);
  const body = renderRootLlmsFull(entries, siteSettings);
  return new Response(body, { headers: TEXT_HEADERS });
}
