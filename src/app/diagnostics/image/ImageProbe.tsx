"use client";

import { useEffect, useState } from "react";

const PROBE = "/_next/image?url=" + encodeURIComponent("https://placehold.co/800x600.png?text=Diagnostics") + "&w=640&q=75";

type Probe = { loading: boolean; status?: number; contentType?: string | null; contentLength?: string | null; error?: string };

export function ImageProbe() {
  const [probe, setProbe] = useState<Probe>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(PROBE)
      .then((res) => {
        if (cancelled) return;
        setProbe({
          loading: false,
          status: res.status,
          contentType: res.headers.get("content-type"),
          contentLength: res.headers.get("content-length"),
        });
      })
      .catch((e) => {
        if (!cancelled) setProbe({ loading: false, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (probe.loading) return <pre className="text-xs text-gray-500">probing {PROBE}…</pre>;
  if (probe.error) return <pre className="text-xs text-red-700">Error: {probe.error}</pre>;

  const optimized = probe.contentType?.includes("webp") || probe.contentType?.includes("avif");

  return (
    <div className="space-y-2 text-xs font-mono">
      <div>URL: {PROBE}</div>
      <div>HTTP {probe.status}</div>
      <div>Content-Type: {probe.contentType ?? "(none)"} {optimized && <span className="text-green-700 font-bold">[transcoded]</span>}</div>
      <div>Content-Length: {probe.contentLength ?? "(none)"}</div>
    </div>
  );
}
