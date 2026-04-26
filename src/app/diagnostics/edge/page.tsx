import { TestPage, Evidence } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { EdgeProbe } from "./EdgeProbe";

export const dynamic = "force-static";

export default function EdgePage() {
  return (
    <TestPage
      title="Edge runtime route"
      category="E. Edge"
      whatItTests={
        <p>
          A route handler at <code>/api/diagnostics/edge</code> declared
          with <code>export const runtime = &apos;edge&apos;</code>. The
          handler reports whether it actually ran on the Edge runtime
          (web-standards-only, no <code>process</code>) or fell back to
          Node.js.
        </p>
      }
      whyItMatters={
        <p>
          Edge runtime is faster to cold-start and cheaper, but only
          available on a subset of hosts (Vercel, Cloudflare). On most
          self-hosted Node containers — likely including Optimizely
          Frontend Hosting — declaring <code>runtime: &apos;edge&apos;</code>{" "}
          either errors at build, falls back to Node, or refuses to deploy.
        </p>
      }
      howToInterpret={
        <p>
          If the probe returns <code>actualRuntime: &quot;edge&quot;</code>,{" "}
          the host fully supports Edge. <code>&quot;nodejs (fallback)&quot;</code>{" "}
          means Next.js silently used Node anyway. A 500 / network error
          probably means the build refused the route entirely.
        </p>
      }
    >
      <Evidence title="Probe response">
        <EdgeProbe />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if actualRuntime is 'edge'; warn if 'nodejs (fallback)'; fail if request errors." />
      </div>
    </TestPage>
  );
}
