import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { MODULE_LOAD_TIME, PROCESS_ID, formatStamp, ageHuman, requestNow } from "../_lib/shared";

export const dynamic = "force-dynamic";

export default function SsrPage() {
  const now = requestNow();
  return (
    <TestPage
      title="SSR — Server-Side Rendering"
      category="B. Rendering"
      whatItTests={
        <p>
          A page declared <code>force-dynamic</code>. Next.js skips the cache
          and re-renders the page on every single request inside the
          container.
        </p>
      }
      whyItMatters={
        <p>
          SSR is what you need when content is per-user, time-sensitive, or
          depends on request data (cookies, headers, search params). It is
          the most expensive serving mode — every request runs Node.js.
        </p>
      }
      howToInterpret={
        <p>
          Reload — the request time MUST update every time. Module load
          time changes only when the container process restarts. PROCESS_ID
          flipping between two values across reloads means a load balancer
          is rotating you between replicas.
        </p>
      }
    >
      <Evidence title="Stamps">
        <Row label="Module load (container start)" value={`${formatStamp(MODULE_LOAD_TIME)}  (${ageHuman(MODULE_LOAD_TIME, now)} ago)`} />
        <Row label="Request time" value={formatStamp(now)} />
        <Row label="Process ID" value={PROCESS_ID} />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if request time changes on every reload." />
      </div>
    </TestPage>
  );
}
