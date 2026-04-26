import { Suspense } from "react";
import { TestPage, Evidence } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { StreamMarker } from "./StreamMarker";

export const dynamic = "force-dynamic";

async function Slow({ ms, label }: { ms: number; label: string }) {
  await new Promise((r) => setTimeout(r, ms));
  return <StreamMarker label={label} serverDelayMs={ms} />;
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-sm font-mono text-gray-400">
      {label} — loading…
    </div>
  );
}

export default function StreamingPage() {
  return (
    <TestPage
      title="Streaming with Suspense"
      category="D. React 19"
      whatItTests={
        <p>
          Three async server components inside three{" "}
          <code>&lt;Suspense&gt;</code> boundaries, deliberately delayed
          0/500/2000 ms. React streams each to the browser as it resolves.
        </p>
      }
      whyItMatters={
        <p>
          Streaming sends the static shell immediately and the slow
          islands as they finish. Without it, a slow data fetch holds up
          first-byte for the whole page. Streaming requires the host to
          flush response chunks (no buffering proxies, correct HTTP
          headers).
        </p>
      }
      howToInterpret={
        <p>
          Open DevTools → Network → click the document request → Response
          tab. You should see content arriving in chunks rather than all
          at once. Below, each marker reports its mount time relative to
          the first — they should mount roughly 0, 500, 2000 ms apart.
          If they all mount within a few ms of each other, the host is
          buffering the response (bad).
        </p>
      }
    >
      <Evidence title="Streamed islands">
        <Suspense fallback={<Skeleton label="A (0ms)" />}>
          <Slow ms={0} label="A (0ms)" />
        </Suspense>
        <Suspense fallback={<Skeleton label="B (500ms)" />}>
          <Slow ms={500} label="B (500ms)" />
        </Suspense>
        <Suspense fallback={<Skeleton label="C (2000ms)" />}>
          <Slow ms={2000} label="C (2000ms)" />
        </Suspense>
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if mount times are spread roughly 0/500/2000 ms apart and DevTools shows incremental response." />
      </div>
    </TestPage>
  );
}
