"use client";

import { useEffect, useState } from "react";

type Probe = {
  loading: boolean;
  status?: number;
  body?: unknown;
  error?: string;
};

export function EdgeProbe() {
  const [probe, setProbe] = useState<Probe>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/diagnostics/edge")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!cancelled) setProbe({ loading: false, status: res.status, body });
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

  return (
    <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
      HTTP {probe.status}
      {"\n"}
      {JSON.stringify(probe.body, null, 2)}
    </pre>
  );
}
