"use client";

import { useEffect, useState } from "react";

let firstMountAt: number | null = null;

export function StreamMarker({ label, serverDelayMs }: { label: string; serverDelayMs: number }) {
  const [mountedAt, setMountedAt] = useState<number | null>(null);

  useEffect(() => {
    const now = performance.now();
    if (firstMountAt === null) firstMountAt = now;
    // One-shot capture of the mount-time clock value — this is exactly the
    // "subscribe to an external system" exception the lint rule allows for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMountedAt(now);
  }, []);

  const sinceFirst = mountedAt !== null && firstMountAt !== null ? mountedAt - firstMountAt : null;

  return (
    <div className="rounded border border-gray-300 bg-white p-3 text-sm font-mono">
      <div className="text-gray-700">
        <strong>{label}</strong> — server delayed {serverDelayMs} ms
      </div>
      <div className="text-gray-500 text-xs mt-1">
        client mount t = {sinceFirst === null ? "(pending hydration)" : `+${sinceFirst.toFixed(0)} ms after first marker`}
      </div>
    </div>
  );
}
