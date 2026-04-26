import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { MODULE_LOAD_TIME, formatStamp } from "../_lib/shared";

export const dynamic = "force-static";

const RENDER_TIME = Date.now();

export default function SsgPage() {
  return (
    <TestPage
      title="SSG — Static Site Generation"
      category="B. Rendering"
      whatItTests={
        <p>
          A page rendered once during <code>next build</code>. The HTML
          (with the timestamps below baked in) is written to disk and served
          from there forever.
        </p>
      }
      whyItMatters={
        <p>
          Static pages are the cheapest and fastest serving mode — no Node.js
          execution per request, trivially CDN-cacheable. Every page that
          doesn&apos;t need per-request data should ideally be SSG.
        </p>
      }
      howToInterpret={
        <p>
          Reload the page several times. Both stamps below MUST stay
          identical. If they update on every reload, SSG is not actually
          taking effect (perhaps because something in the layout opted the
          tree into dynamic rendering).
        </p>
      }
    >
      <Evidence title="Stamps captured during render">
        <Row label="Module load time" value={formatStamp(MODULE_LOAD_TIME)} />
        <Row label="Render time" value={formatStamp(RENDER_TIME)} />
      </Evidence>

      <Evidence title="What to look for in the network tab">
        <Row label="Response header" value="x-nextjs-cache should be HIT or PRERENDER" />
        <Row label="Response header" value="cache-control should include s-maxage / public" />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if stamps never change across reloads." />
      </div>
    </TestPage>
  );
}
