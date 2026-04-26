"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RevalidateButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function trigger() {
    setResult(null);
    const res = await fetch("/api/diagnostics/revalidate", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setResult(`HTTP ${res.status} — ${JSON.stringify(json)}`);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={trigger}
        disabled={pending}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Revalidating…" : "Trigger revalidateTag('diagnostics-on-demand')"}
      </button>
      {result && <div className="text-xs font-mono text-gray-700">{result}</div>}
    </div>
  );
}
