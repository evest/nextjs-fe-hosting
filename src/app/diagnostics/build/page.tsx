import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { MODULE_LOAD_TIME, formatStamp } from "../_lib/shared";

export const dynamic = "force-static";

const BUILD_RENDER_TIME = Date.now();

export default function BuildPage() {
  return (
    <TestPage
      title="Build info"
      category="A. Environment"
      whatItTests={
        <p>
          A force-static page that captures <code>Date.now()</code> at module
          load. Because the module is evaluated during <code>next build</code>,
          that timestamp is frozen into the HTML and tells you when the
          currently-served bundle was built.
        </p>
      }
      whyItMatters={
        <p>
          Confirms the deploy you think is live actually is. If the build
          stamp predates a recent deploy, the container did not pick up the
          new artifact (or you are looking at a CDN-cached older version).
        </p>
      }
      howToInterpret={
        <p>
          Reload — the stamp must NOT change. If it changes, the page is not
          being served statically. If the stamp matches your most-recent
          deploy time, the build is fresh.
        </p>
      }
    >
      <Evidence title="Build artifact">
        <Row label="Module load time (frozen)" value={formatStamp(MODULE_LOAD_TIME)} />
        <Row label="Render time (frozen)" value={formatStamp(BUILD_RENDER_TIME)} />
        <Row label="NODE_ENV at build" value={process.env.NODE_ENV ?? "(unset)"} />
      </Evidence>

      <div>
        <Verdict value="manual" note="If both stamps match your most recent deploy and never change on reload, build pipeline is healthy." />
      </div>
    </TestPage>
  );
}
