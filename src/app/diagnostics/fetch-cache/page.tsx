import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { formatStamp, requestNow } from "../_lib/shared";

const PROBE_URL = "https://api.github.com/zen";
const REVALIDATE_SECONDS = 60;

async function fetchCachedQuote(): Promise<{ ok: boolean; body: string; error?: string }> {
  try {
    const res = await fetch(PROBE_URL, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["diagnostics-fetch-cache"] },
    });
    if (!res.ok) return { ok: false, body: "", error: `HTTP ${res.status}` };
    return { ok: true, body: await res.text() };
  } catch (e) {
    return { ok: false, body: "", error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchFreshQuote(): Promise<{ ok: boolean; body: string; error?: string }> {
  try {
    const res = await fetch(PROBE_URL, { cache: "no-store" });
    if (!res.ok) return { ok: false, body: "", error: `HTTP ${res.status}` };
    return { ok: true, body: await res.text() };
  } catch (e) {
    return { ok: false, body: "", error: e instanceof Error ? e.message : String(e) };
  }
}

export const dynamic = "force-dynamic";

export default async function FetchCachePage() {
  const renderedAt = requestNow();
  const [cached, fresh] = await Promise.all([fetchCachedQuote(), fetchFreshQuote()]);

  return (
    <TestPage
      title="fetch() data cache"
      category="C. Caching"
      whatItTests={
        <p>
          Two server-side fetches of <code>{PROBE_URL}</code> — one with{" "}
          <code>next: {"{ revalidate: 60 }"}</code>, one with{" "}
          <code>cache: &apos;no-store&apos;</code>. The endpoint returns a
          different random quote every call, so unchanged output proves the
          response was served from cache.
        </p>
      }
      whyItMatters={
        <p>
          The fetch data cache lets you fan out a single upstream request
          and reuse the answer across many page renders, dramatically
          reducing latency and load on origin APIs (CMS, GraphQL, REST).
          Requires the host to allow outbound HTTPS to the target.
        </p>
      }
      howToInterpret={
        <p>
          Reload several times. The <em>cached</em> quote should stay the
          same for ~60 seconds; the <em>fresh</em> quote should change
          every reload. If the cached quote also changes every reload,
          fetch caching is not taking effect. If both error out, the
          container cannot reach github.com.
        </p>
      }
    >
      <Evidence title="Cached fetch (revalidate 60s)">
        {cached.ok ? <Row label="Body" value={cached.body} /> : <Row label="Error" value={cached.error ?? "unknown"} />}
      </Evidence>

      <Evidence title="Fresh fetch (no-store)">
        {fresh.ok ? <Row label="Body" value={fresh.body} /> : <Row label="Error" value={fresh.error ?? "unknown"} />}
      </Evidence>

      <Evidence title="Render context">
        <Row label="Page rendered at" value={formatStamp(renderedAt)} />
        <Row label="Probe URL" value={PROBE_URL} />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if cached body stays stable while fresh body changes; fail if both change together." />
      </div>
    </TestPage>
  );
}
