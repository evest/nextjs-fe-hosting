import { unstable_cache } from "next/cache";
import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { PROCESS_ID, formatStamp } from "../_lib/shared";
import { RevalidateButton } from "./RevalidateButton";

const getTaggedStamp = unstable_cache(
  async () => Date.now(),
  ["diagnostics-on-demand"],
  { tags: ["diagnostics-on-demand"] }
);

export const dynamic = "force-dynamic";

export default async function OnDemandPage() {
  const cachedStamp = await getTaggedStamp();
  return (
    <TestPage
      title="On-demand revalidation"
      category="C. Caching"
      whatItTests={
        <p>
          A cached function tagged{" "}
          <code>&apos;diagnostics-on-demand&apos;</code> with no automatic
          expiry. The button below POSTs to{" "}
          <code>/api/diagnostics/revalidate</code>, which calls{" "}
          <code>revalidateTag(&apos;diagnostics-on-demand&apos;)</code>.
          The cached stamp should update on the next request.
        </p>
      }
      whyItMatters={
        <>
          <p>
            On-demand revalidation is what powers CMS webhooks: when an
            editor publishes content, you call{" "}
            <code>revalidateTag</code> from your{" "}
            <code>/api/revalidate</code> endpoint and only the affected
            pages refresh.
          </p>
          <p>
            <strong>Container caveat:</strong> with multiple replicas, each
            replica caches independently. <code>revalidateTag</code> only
            invalidates the replica that received the request unless you
            configure a shared cache handler. Watch PROCESS_ID across
            reloads.
          </p>
        </>
      }
      howToInterpret={
        <p>
          Reload — the cached stamp must stay constant. Click the button,
          then reload — the cached stamp must update to a new value. If it
          doesn&apos;t update, on-demand revalidation is broken (or you
          are hitting a different replica than the one that received the
          revalidate call).
        </p>
      }
    >
      <Evidence title="Cached stamp">
        <Row label="Tagged value" value={formatStamp(cachedStamp)} />
        <Row label="Process ID" value={PROCESS_ID} />
      </Evidence>

      <RevalidateButton />

      <div>
        <Verdict value="manual" note="Pass if stamp updates after clicking the button + reloading." />
      </div>
    </TestPage>
  );
}
