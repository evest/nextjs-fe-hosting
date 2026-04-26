import { unstable_cache } from "next/cache";
import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { formatStamp, requestNow } from "../_lib/shared";

export const dynamic = "force-dynamic";

// Legacy cache API. Wraps a function and caches the return value across
// requests for `revalidate` seconds, scoped to the given key+tags.
const getCachedStamp = unstable_cache(
  async () => Date.now(),
  ["diagnostics-use-cache"],
  { revalidate: 60, tags: ["diagnostics-use-cache"] }
);

export default async function UseCachePage() {
  const cachedStamp = await getCachedStamp();
  const freshStamp = requestNow();

  return (
    <TestPage
      title="Server-side function cache"
      category="C. Caching"
      whatItTests={
        <p>
          A function wrapped in <code>unstable_cache</code> (the legacy
          API). Next.js memoises the return value across requests for 60
          seconds, scoped to the cache key and tags.
        </p>
      }
      whyItMatters={
        <>
          <p>
            This is how you cache any server-side computation: GraphQL
            queries, database reads, expensive transformations.
          </p>
          <p>
            Next 15+ added a newer <code>&apos;use cache&apos;</code>{" "}
            directive that does the same thing more ergonomically, but it
            requires the <code>cacheComponents</code> experimental flag —
            which is intentionally OFF in this project (see{" "}
            <code>next.config.ts</code>) to avoid disrupting the existing
            CMS pages. The legacy API tested here gives equivalent
            functionality and works without the flag.
          </p>
        </>
      }
      howToInterpret={
        <p>
          The cached stamp must stay constant across reloads (within 60s).
          The fresh stamp updates every reload. If both update every
          reload, function caching is not taking effect.
        </p>
      }
    >
      <Evidence title="Stamps">
        <Row label="Cached stamp (unstable_cache, 60s)" value={formatStamp(cachedStamp)} />
        <Row label="Fresh stamp (no cache)" value={formatStamp(freshStamp)} />
        <Row label="Difference" value={`${freshStamp - cachedStamp} ms`} />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if cached stamp stays stable while fresh stamp updates." />
      </div>
    </TestPage>
  );
}
