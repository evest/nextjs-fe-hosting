import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { formatStamp } from "../_lib/shared";

export const dynamic = "force-static";

const SHELL_RENDER_TIME = Date.now();

export default function PprPage() {
  return (
    <TestPage
      title="PPR — Partial Prerendering"
      category="B. Rendering"
      whatItTests={
        <p>
          PPR mixes a static shell with dynamic Suspense holes in the same
          response. In Next 16, PPR is part of <code>cacheComponents</code>{" "}
          (not a separate flag) and currently NOT enabled in this project
          (see comment in <code>next.config.ts</code>).
        </p>
      }
      whyItMatters={
        <p>
          PPR gives you most of the speed of SSG even on pages that need
          per-request data, by keeping the shell static and only streaming
          the parts that truly need each request. Enabling it requires
          refactoring every page that does uncached data access to wrap
          it in <code>&lt;Suspense&gt;</code>.
        </p>
      }
      howToInterpret={
        <p>
          With <code>cacheComponents</code> disabled, this page is just a
          static shell. The render time below is frozen at build. To enable
          real PPR, set <code>cacheComponents: true</code> in{" "}
          <code>next.config.ts</code> and refactor the existing CMS pages
          to wrap async fetches in Suspense.
        </p>
      }
    >
      <Evidence title="Status">
        <Row label="cacheComponents enabled" value="false (intentionally)" />
        <Row label="Shell render time (frozen)" value={formatStamp(SHELL_RENDER_TIME)} />
      </Evidence>

      <div>
        <Verdict value="manual" note="Currently a static page; enable cacheComponents to test true PPR." />
      </div>
    </TestPage>
  );
}
