import { headers } from "next/headers";
import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";

export const dynamic = "force-dynamic";

export default async function MiddlewarePage() {
  const h = await headers();
  const flag = h.get("x-diagnostics-middleware");
  const stamp = h.get("x-diagnostics-middleware-stamp");
  const path = h.get("x-diagnostics-middleware-path");
  const passed = flag === "1";

  return (
    <TestPage
      title="Middleware (proxy)"
      category="E. Edge"
      whatItTests={
        <p>
          The project&apos;s <code>src/proxy.ts</code> (Next 16 renamed
          <code>middleware.ts</code> to <code>proxy.ts</code>) sets three
          headers on requests matching <code>/diagnostics/*</code>. This
          page reads them via <code>headers()</code> and reports what it
          sees.
        </p>
      }
      whyItMatters={
        <p>
          Middleware/proxy runs on every matching request before the route
          handler — used for auth, A/B testing, locale rewrites, and
          headers. If the host doesn&apos;t execute it, none of those work.
        </p>
      }
      howToInterpret={
        <p>
          The values must be present and the stamp must update on each
          reload. Missing values mean the proxy did not execute (or did
          not match this path).
        </p>
      }
    >
      <Evidence title="Headers set by proxy.ts">
        <Row label="x-diagnostics-middleware" value={flag ?? "(missing)"} />
        <Row label="x-diagnostics-middleware-stamp" value={stamp ?? "(missing)"} />
        <Row label="x-diagnostics-middleware-path" value={path ?? "(missing)"} />
      </Evidence>

      <div>
        <Verdict
          value={passed ? "pass" : "fail"}
          note={passed ? "Proxy executed for this request." : "Headers missing — proxy did not run."}
        />
      </div>
    </TestPage>
  );
}
