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
        <>
          <p>
            A route handler at <code>/api/diagnostics/edge</code> declared with{" "}
            <code>export const runtime = &apos;edge&apos;</code>. The handler
            inspects <em>where</em> it is actually running:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code>EdgeRuntime</code> global — set by the edge-runtime
              sandbox regardless of host.
            </li>
            <li>
              <code>request.cf</code> — only populated by Cloudflare Workers.
              This is the strongest single signal that Cloudflare ran the
              code, not just proxied it.
            </li>
            <li>
              Incoming <code>cf-ray</code> header — proves Cloudflare is in
              front as a CDN, but does not prove it executed your handler.
            </li>
          </ul>
        </>
      }
      whyItMatters={
        <>
          <p>
            &quot;Edge runtime&quot; is two different things: a sandbox (no
            Node APIs, web-standards-only) and a deployment topology
            (geographically distributed execution). Cloudflare Workers gives
            you both. A host that runs the edge sandbox on its origin servers
            gives you only the first — same programming model as Workers,
            but execution stays in one region.
          </p>
          <p>
            Optimizely Frontend Hosting puts Cloudflare in front of an Azure
            container origin. Cloudflare handles TLS, WAF, and caching;
            the container runs all the application code, including routes
            marked <code>runtime: &apos;edge&apos;</code>. This test confirms
            which tier is doing what.
          </p>
        </>
      }
      howToInterpret={
        <>
          <p>
            On Optimizely Frontend Hosting the expected verdict is{" "}
            <code>cloudflare-cdn-only-origin-edge-runtime</code>:{" "}
            <code>cf-ray</code> present (Cloudflare proxied),{" "}
            <code>hasCfBinding: false</code> (Cloudflare did not execute the
            handler). That&apos;s the supported topology, not a
            misconfiguration.
          </p>
          <p>
            <code>cloudflare-workers</code> would mean the handler ran inside
            Cloudflare itself — only possible on hosts like Cloudflare Pages
            or Vercel Edge. <code>nodejs-fallback</code> would mean Next.js
            silently ignored <code>runtime: &apos;edge&apos;</code> and used
            a Node thread, which is worth investigating.
          </p>
          <p>
            For a sanity check on geography, hit the route from a non-EU
            location (e.g. webpagetest.org from Sydney). TTFB will balloon
            because execution is pinned to the EU origin — confirming this
            is not a globally-distributed runtime.
          </p>
        </>
      }
    >
      <Evidence title="Probe response">
        <EdgeProbe />
      </Evidence>

      <div>
        <Verdict
          value="manual"
          note="On Optimizely Frontend Hosting, expect 'cloudflare-cdn-only-origin-edge-runtime' — that's the supported topology. 'cloudflare-workers' would require a different host. 'nodejs-fallback' indicates the edge directive was ignored and warrants investigation."
        />
      </div>
    </TestPage>
  );
}
