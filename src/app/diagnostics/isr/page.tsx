import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { PROCESS_ID, formatStamp, requestNow } from "../_lib/shared";

export const revalidate = 30;

export default function IsrPage() {
  const renderedAt = requestNow();
  return (
    <TestPage
      title="ISR — Incremental Static Regeneration"
      category="B. Rendering"
      whatItTests={
        <p>
          A page with <code>export const revalidate = 30</code>. It serves
          the cached HTML, but if the cached version is older than 30
          seconds the next request triggers a background re-render.
        </p>
      }
      whyItMatters={
        <>
          <p>
            ISR is the sweet spot for content that updates occasionally
            (news, marketing, CMS pages): static-fast for visitors,
            self-refreshing without redeploying.
          </p>
          <p>
            <strong>Container caveat:</strong> ISR uses Next.js&apos;s cache
            handler. By default that is in-memory per-process — with
            multiple replicas behind a load balancer, each replica caches
            independently and you may see different stamps depending on
            which replica answers.
          </p>
        </>
      }
      howToInterpret={
        <p>
          Reload immediately a few times — the stamp should NOT change.
          Wait 30+ seconds, reload — first reload may still be old; the
          one after should show a fresh stamp. If PROCESS_ID flips
          between reloads, multiple replicas are answering and their
          ISR caches may be out of sync.
        </p>
      }
    >
      <Evidence title="Stamps">
        <Row label="This render" value={formatStamp(renderedAt)} />
        <Row label="Process ID" value={PROCESS_ID} />
        <Row label="Configured revalidate" value="30 seconds" />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if the stamp updates ≈ every 30s, not every reload, and stays consistent across PROCESS_IDs." />
      </div>
    </TestPage>
  );
}
