import { draftMode } from "next/headers";
import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { DraftToggle } from "./DraftToggle";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const dm = await draftMode();
  return (
    <TestPage
      title="Draft mode"
      category="F. Other"
      whatItTests={
        <p>
          Draft mode toggles a signed cookie. When enabled, all subsequent
          requests in the same browser bypass the static cache and run
          dynamically — useful for CMS preview without invalidating the
          public cache. The buttons below call{" "}
          <code>/api/diagnostics/draft-toggle</code>, which calls
          <code> draftMode().enable()</code> or <code>.disable()</code>.
        </p>
      }
      whyItMatters={
        <p>
          This is the mechanism behind the existing <code>/preview</code>{" "}
          route. If draft mode does not flip the cookie or the cookie is
          ignored, in-CMS preview cannot show unpublished content.
        </p>
      }
      howToInterpret={
        <p>
          Click Enable — the status below should switch to{" "}
          <code>true</code> after the page refreshes. Inspect cookies in
          DevTools — you should see <code>__prerender_bypass</code> set.
          Click Disable to clear it.
        </p>
      }
    >
      <Evidence title="Status">
        <Row label="draftMode().isEnabled" value={String(dm.isEnabled)} />
      </Evidence>

      <DraftToggle />

      <div>
        <Verdict
          value={dm.isEnabled ? "pass" : "manual"}
          note={dm.isEnabled ? "Draft mode is currently active." : "Currently off — click Enable to test."}
        />
      </div>
    </TestPage>
  );
}
