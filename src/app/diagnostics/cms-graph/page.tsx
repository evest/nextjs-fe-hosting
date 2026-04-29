import { Suspense } from "react";
import { GraphClient } from "@optimizely/cms-sdk";
import { getGraphGatewayUrl } from "@/lib/config";

// Server-rendered on every request. No `'use cache'` — the whole point is
// to read live state from Optimizely Graph. Under cacheComponents, the
// uncached probe must live inside a <Suspense> boundary so the static shell
// (header/help text) can be prerendered while the probe runs at request time.

const PROBE_QUERY = `
  query ProbeOnePage {
    _Content(
      where: { _metadata: { url: { default: { exist: true } } } }
      limit: 1
    ) {
      items {
        _metadata {
          displayName
          locale
          types
          url { default hierarchical type base }
        }
      }
    }
  }
`;

type UrlMeta = {
  default?: string | null;
  hierarchical?: string | null;
  type?: "SIMPLE" | "HIERARCHICAL" | string | null;
  base?: string | null;
};

type ContentMeta = {
  displayName?: string;
  locale?: string;
  types?: string[];
  url?: UrlMeta;
};

type ProbeResult =
  | { ok: true; meta: ContentMeta }
  | { ok: false; error: string };

type Verdict = "pass" | "warn" | "fail";

const VERDICT_CLASSES: Record<Verdict, string> = {
  pass: "bg-green-100 text-green-900 border-green-300",
  warn: "bg-yellow-100 text-yellow-900 border-yellow-300",
  fail: "bg-red-100 text-red-900 border-red-300",
};

async function probe(): Promise<ProbeResult> {
  if (!process.env.OPTIMIZELY_GRAPH_SINGLE_KEY) {
    return { ok: false, error: "OPTIMIZELY_GRAPH_SINGLE_KEY is not set" };
  }
  try {
    const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY, {
      graphUrl: getGraphGatewayUrl(),
    });
    const resp = await client.request(PROBE_QUERY, {});
    const meta = resp?._Content?.items?.[0]?._metadata as ContentMeta | undefined;
    if (!meta) return { ok: false, error: "Graph returned no items" };
    return { ok: true, meta };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-2 items-baseline border-b border-gray-100 pb-1 last:border-0 text-sm font-mono">
      <span className="text-gray-500 min-w-48">{label}</span>
      <span className="text-gray-900 break-all">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-gray-300 p-4 bg-white">
      <h2 className="font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

async function ProbeResults() {
  const result = await probe();

  let verdict: Verdict;
  let verdictNote: string;
  if (!result.ok) {
    verdict = "fail";
    verdictNote = result.error;
  } else {
    const def = result.meta.url?.default;
    const hier = result.meta.url?.hierarchical;
    if (def) {
      verdict = "pass";
      verdictNote =
        "url.default is populated. The official /hooks/graph (which reads url.default) will resolve this page correctly.";
    } else if (hier) {
      verdict = "warn";
      verdictNote =
        "url.default is null but url.hierarchical is populated. /hooks/graph will silently no-op for this page; either fix url.default in CMS Site settings, or fall back to url.hierarchical in /hooks/graph.";
    } else {
      verdict = "fail";
      verdictNote =
        "Both url.default and url.hierarchical are null. /hooks/graph cannot resolve this docId to a path — investigate CMS Site URL configuration.";
    }
  }

  return (
    <>
      {result.ok ? (
        <>
          <Section title="Resolved metadata">
            <Row label="displayName" value={result.meta.displayName ?? "(none)"} />
            <Row label="locale" value={result.meta.locale ?? "(none)"} />
            <Row label="types" value={(result.meta.types ?? []).join(", ") || "(none)"} />
          </Section>

          <Section title="URL block">
            <Row label="url.default" value={result.meta.url?.default ?? "(null)"} />
            <Row label="url.hierarchical" value={result.meta.url?.hierarchical ?? "(null)"} />
            <Row label="url.type" value={result.meta.url?.type ?? "(none)"} />
            <Row label="url.base" value={result.meta.url?.base ?? "(null)"} />
          </Section>

          <Section title="Webhook implication">
            <Row label="Field /hooks/graph reads (per official ref)" value="url.default" />
            <Row
              label="Will the official handler resolve this page?"
              value={result.meta.url?.default ? "Yes" : "No — url.default is null"}
            />
          </Section>
        </>
      ) : (
        <Section title="Probe error">
          <Row label="Error" value={result.error} />
        </Section>
      )}

      <div>
        <span
          className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-mono border rounded ${VERDICT_CLASSES[verdict]}`}
        >
          <span className="font-bold">{verdict.toUpperCase()}</span>
          <span className="font-normal">{verdictNote}</span>
        </span>
      </div>
    </>
  );
}

export default function CmsGraphPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">CMS</p>
        <h1 className="text-3xl font-bold mt-1">CMS Graph URL shape</h1>
        <p className="mt-3 text-gray-600 text-sm leading-relaxed">
          A single GraphQL query against Optimizely Graph that fetches one
          published page&apos;s <code>_metadata.url</code>. Reports{" "}
          <code>url.default</code>, <code>url.hierarchical</code>, and{" "}
          <code>url.type</code>.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <h2 className="font-semibold text-gray-700 mb-2">Why it matters</h2>
          <p className="text-gray-700">
            The Optimizely Graph webhook receiver at <code>/hooks/graph</code>{" "}
            reads <code>_metadata.url.default</code> when resolving a published{" "}
            <code>docId</code> back to a URL (per the official Optimizely ISR
            reference). If <code>url.default</code> is <code>null</code> for a
            published item, the webhook silently no-ops — content updates
            return 200 but never invalidate any page. This probe surfaces
            that failure mode up front rather than as &quot;editors say
            content doesn&apos;t update&quot; reports later.
          </p>
        </div>
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <h2 className="font-semibold text-gray-700 mb-2">How to interpret</h2>
          <ul className="text-gray-700 space-y-2">
            <li>
              <strong>Pass:</strong> <code>url.default</code> is non-null.
              The official <code>/hooks/graph</code> works as written.
            </li>
            <li>
              <strong>Warn:</strong> <code>url.default</code> is null but{" "}
              <code>url.hierarchical</code> is populated. Fix the CMS Site
              URL config, or modify <code>/hooks/graph</code> to fall back.
            </li>
            <li>
              <strong>Fail:</strong> probe could not reach Graph or both
              URL fields are null. Check{" "}
              <code>OPTIMIZELY_GRAPH_SINGLE_KEY</code> /{" "}
              <code>OPTIMIZELY_GRAPH_GATEWAY</code> and that at least one
              page is Published.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <Suspense fallback={<Section title="Probing…"><Row label="Status" value="Querying Optimizely Graph…" /></Section>}>
          <ProbeResults />
        </Suspense>
      </section>
    </div>
  );
}
