import { headers } from "next/headers";
import { TestPage, Evidence, Row } from "../../_components/TestPage";
import { Verdict } from "../../_components/Verdict";
import { formatStamp, requestNow } from "../../_lib/shared";

const PRE_RENDERED = ["alpha", "beta", "gamma"];

export function generateStaticParams() {
  return PRE_RENDERED.map((id) => ({ id }));
}

export const dynamicParams = true;

export default async function StaticParamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wasPreRendered = PRE_RENDERED.includes(id);

  // For non-pre-rendered IDs, opt out of the full route cache so each request
  // re-renders. Without this, the first on-demand render of `zeta` would be
  // cached and subsequent reloads would return the same stamp — defeating the
  // point of the diagnostic.
  if (!wasPreRendered) {
    await headers();
  }

  const renderedAt = requestNow();

  return (
    <TestPage
      title={`generateStaticParams — id=${id}`}
      category="B. Rendering"
      whatItTests={
        <p>
          A child of <code>/diagnostics/static-params/[id]</code>.
          {wasPreRendered
            ? " This ID was returned by generateStaticParams, so the page is statically pre-rendered."
            : " This ID was NOT in generateStaticParams, so the page is rendered on demand."}
        </p>
      }
      whyItMatters={
        <p>
          Same trade-off as SSG vs SSR but applied per-URL on a dynamic
          route — exactly the model used to build hundreds of CMS pages
          at deploy time.
        </p>
      }
      howToInterpret={
        wasPreRendered ? (
          <p>Pre-rendered: stamp must stay constant across reloads.</p>
        ) : (
          <p>Not pre-rendered: stamp must update each reload.</p>
        )
      }
    >
      <Evidence title="This route">
        <Row label="param.id" value={id} />
        <Row label="In generateStaticParams" value={wasPreRendered ? "yes" : "no"} />
        <Row label="Render time" value={formatStamp(renderedAt)} />
      </Evidence>

      <div>
        <Verdict
          value="manual"
          note={
            wasPreRendered
              ? "Pass if stamp never changes."
              : "Pass if stamp changes every reload (dynamic fallback works)."
          }
        />
      </div>
    </TestPage>
  );
}
