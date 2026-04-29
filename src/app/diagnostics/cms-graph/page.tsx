import { GraphClient } from "@optimizely/cms-sdk";
import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import type { Verdict as VerdictType } from "../_lib/shared";
import { getGraphGatewayUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

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

export default async function CmsGraphPage() {
  const result = await probe();

  let verdict: VerdictType = "manual";
  let verdictNote = "";
  if (!result.ok) {
    verdict = "fail";
    verdictNote = result.error;
  } else {
    const def = result.meta.url?.default;
    const hier = result.meta.url?.hierarchical;
    if (def) {
      verdict = "pass";
      verdictNote = "url.default is populated. The official /hooks/graph (which reads url.default) will resolve this page correctly.";
    } else if (hier) {
      verdict = "warn";
      verdictNote = "url.default is null but url.hierarchical is populated. The official /hooks/graph will silently no-op for this page; either fix url.default in CMS Site settings, or fall back to url.hierarchical in /hooks/graph.";
    } else {
      verdict = "fail";
      verdictNote = "Both url.default and url.hierarchical are null. /hooks/graph cannot resolve this docId to a path — investigate CMS Site URL configuration.";
    }
  }

  return (
    <TestPage
      title="CMS Graph URL shape"
      category="G. CMS"
      whatItTests={
        <p>
          A single GraphQL query against Optimizely Graph that fetches one
          published page&apos;s <code>_metadata.url</code>. Reports{" "}
          <code>url.default</code>, <code>url.hierarchical</code>, and{" "}
          <code>url.type</code>.
        </p>
      }
      whyItMatters={
        <>
          <p>
            The Optimizely Graph webhook receiver at{" "}
            <code>/hooks/graph</code> reads{" "}
            <code>_metadata.url.default</code> when resolving a published{" "}
            <code>docId</code> back to a URL (per the official Optimizely
            ISR reference). If <code>url.default</code> is{" "}
            <code>null</code> for a published item, the webhook silently
            no-ops — content updates return 200 but never invalidate any
            page.
          </p>
          <p>
            This probe surfaces that failure mode up front rather than as
            &quot;editors say content doesn&apos;t update&quot; reports
            later. It also reports <code>url.type</code> and{" "}
            <code>url.hierarchical</code> for diagnostic context if{" "}
            <code>url.default</code> ever stops being populated.
          </p>
        </>
      }
      howToInterpret={
        <>
          <p>
            <strong>Pass:</strong> <code>url.default</code> is non-null on
            the probe page. The official <code>/hooks/graph</code>{" "}
            implementation will work as written.
          </p>
          <p>
            <strong>Warn:</strong> <code>url.default</code> is null but{" "}
            <code>url.hierarchical</code> is populated. Two ways forward —
            (a) fix the CMS Site URL config so <code>url.default</code>{" "}
            populates correctly, or (b) modify <code>/hooks/graph</code> to
            fall back to <code>url.hierarchical</code> with the Start Page
            prefix stripped. Option (a) is preferable because it keeps the
            site identical to Optimizely&apos;s reference implementation.
          </p>
          <p>
            <strong>Fail:</strong> probe could not reach Graph, returned
            no items, or both URL fields are null. Check{" "}
            <code>OPTIMIZELY_GRAPH_SINGLE_KEY</code> /{" "}
            <code>OPTIMIZELY_GRAPH_GATEWAY</code>, then verify there is at
            least one Published page and the CMS Site URL config is set.
          </p>
        </>
      }
    >
      {result.ok ? (
        <>
          <Evidence title="Resolved metadata">
            <Row label="displayName" value={result.meta.displayName ?? "(none)"} />
            <Row label="locale" value={result.meta.locale ?? "(none)"} />
            <Row label="types" value={(result.meta.types ?? []).join(", ") || "(none)"} />
          </Evidence>

          <Evidence title="URL block">
            <Row label="url.default" value={result.meta.url?.default ?? "(null)"} />
            <Row label="url.hierarchical" value={result.meta.url?.hierarchical ?? "(null)"} />
            <Row label="url.type" value={result.meta.url?.type ?? "(none)"} />
            <Row label="url.base" value={result.meta.url?.base ?? "(null)"} />
          </Evidence>

          <Evidence title="Webhook implication">
            <Row
              label="Field /hooks/graph reads (per official ref)"
              value="url.default"
            />
            <Row
              label="Will the official handler resolve this page?"
              value={result.meta.url?.default ? "Yes" : "No — url.default is null"}
            />
          </Evidence>
        </>
      ) : (
        <Evidence title="Probe error">
          <Row label="Error" value={result.error} />
        </Evidence>
      )}

      <div>
        <Verdict value={verdict} note={verdictNote} />
      </div>
    </TestPage>
  );
}
