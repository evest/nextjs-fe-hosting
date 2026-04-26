"use client";

import { useEffect, useState } from "react";

type ExecutionHost =
  | "cloudflare-workers"
  | "cloudflare-cdn-only-origin-edge-runtime"
  | "edge-runtime-on-origin"
  | "nodejs-fallback"
  | "unknown";

type ProbeBody = {
  declaredRuntime: string;
  actualRuntime: string;
  edgeRuntimeMarker: string | null;
  hasNodeProcess: boolean;
  nodeVersion: string | null;
  executionHost: ExecutionHost;
  hasCfBinding: boolean;
  cf: Record<string, unknown> | null;
  cfRayColo: string | null;
  requestHeaders: Record<string, string | null>;
  requestTime: string;
};

type Probe = {
  loading: boolean;
  status?: number;
  body?: ProbeBody;
  ttfbMs?: number;
  error?: string;
};

const VERDICTS: Record<ExecutionHost, { label: string; tone: string; explainer: string }> = {
  "cloudflare-workers": {
    label: "Running in Cloudflare Workers",
    tone: "text-green-700 bg-green-50 border-green-300",
    explainer:
      "request.cf is populated, which only happens when the V8 isolate is executing inside Cloudflare's Workers runtime. The handler ran at the Cloudflare edge — geographically close to the user, no origin round-trip.",
  },
  "cloudflare-cdn-only-origin-edge-runtime": {
    label: "Cloudflare CDN in front, edge-runtime sandbox on origin",
    tone: "text-blue-700 bg-blue-50 border-blue-300",
    explainer:
      "This is the expected topology for Optimizely Frontend Hosting. Cloudflare terminates TLS, applies WAF/DDoS, and can cache responses globally — but it does not execute your code. The edge-runtime sandbox runs on Optimizely's Azure container origin, which gives you the web-standards programming model (no Node APIs, smaller cold starts) without geographic distribution. For globally-distributed page delivery, rely on Cloudflare cache rules + s-maxage headers rather than edge code.",
  },
  "edge-runtime-on-origin": {
    label: "Edge-runtime sandbox on origin (no Cloudflare detected)",
    tone: "text-amber-700 bg-amber-50 border-amber-300",
    explainer:
      "EdgeRuntime is defined and process is missing, so Next.js set up the edge-runtime sandbox. But there are no Cloudflare headers on the request, so we can't see Cloudflare in this path at all. The handler is running in a V8 isolate on Optimizely's origin.",
  },
  "nodejs-fallback": {
    label: "Silently fell back to Node",
    tone: "text-red-700 bg-red-50 border-red-300",
    explainer:
      "Despite runtime: 'edge', the handler is running on a normal Node.js thread. Either the host doesn't support Edge runtime and Next.js fell back, or the build pipeline rewrote it.",
  },
  unknown: {
    label: "Inconclusive",
    tone: "text-gray-700 bg-gray-50 border-gray-300",
    explainer:
      "Neither edge markers nor Node markers were detected. The runtime environment doesn't match any of the expected signatures.",
  },
};

export function EdgeProbe() {
  const [probe, setProbe] = useState<Probe>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();
    fetch("/api/diagnostics/edge", { cache: "no-store" })
      .then(async (res) => {
        const ttfbMs = Math.round(performance.now() - startedAt);
        const body = (await res.json().catch(() => null)) as ProbeBody | null;
        if (!cancelled && body) setProbe({ loading: false, status: res.status, body, ttfbMs });
        else if (!cancelled) setProbe({ loading: false, status: res.status, error: "non-JSON response" });
      })
      .catch((e) => {
        if (!cancelled) setProbe({ loading: false, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (probe.loading) return <pre className="text-xs text-gray-500">probing /api/diagnostics/edge…</pre>;
  if (probe.error) return <pre className="text-xs text-red-700">Error: {probe.error}</pre>;
  if (!probe.body) return <pre className="text-xs text-red-700">Empty response.</pre>;

  const verdict = VERDICTS[probe.body.executionHost];

  return (
    <div className="space-y-3">
      <div className={`rounded border p-3 text-sm ${verdict.tone}`}>
        <div className="font-semibold mb-1">{verdict.label}</div>
        <div className="text-xs">{verdict.explainer}</div>
      </div>

      <div className="text-xs text-gray-600">
        Round-trip time (browser → response): <span className="font-mono text-gray-900">{probe.ttfbMs} ms</span>.
        A real Cloudflare Worker should be 30–80 ms from anywhere in Europe; 200+ ms suggests an origin round-trip.
      </div>

      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
        HTTP {probe.status}
        {"\n"}
        {JSON.stringify(probe.body, null, 2)}
      </pre>
    </div>
  );
}
