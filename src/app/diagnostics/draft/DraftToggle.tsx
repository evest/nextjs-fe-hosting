"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DraftToggle() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function call(action: "enable" | "disable") {
    setResult(null);
    const res = await fetch(`/api/diagnostics/draft-toggle?action=${action}`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setResult(`HTTP ${res.status} — ${JSON.stringify(json)}`);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => call("enable")}
          disabled={pending}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Enable draft mode
        </button>
        <button
          onClick={() => call("disable")}
          disabled={pending}
          className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          Disable draft mode
        </button>
      </div>
      {result && <div className="text-xs font-mono text-gray-700">{result}</div>}
    </div>
  );
}
