import Link from "next/link";
import { TestPage, Evidence } from "../_components/TestPage";

export const dynamic = "force-static";

export default function StaticParamsIndex() {
  return (
    <TestPage
      title="generateStaticParams"
      category="B. Rendering"
      whatItTests={
        <p>
          A dynamic route <code>[id]</code> whose
          <code>generateStaticParams</code> returns a fixed list of IDs at
          build time. Those pages are pre-rendered (SSG); other IDs fall
          through to dynamic rendering at request time.
        </p>
      }
      whyItMatters={
        <p>
          This is how you statically generate hundreds or thousands of CMS
          pages without writing a route per page. Every URL in
          <code>getAllPagesPaths()</code> can be pre-rendered the same way.
        </p>
      }
      howToInterpret={
        <p>
          Open the pre-rendered IDs (alpha/beta/gamma) — their stamps stay
          frozen across reloads. Open <code>zeta</code> (not in the list)
          — its stamp updates every reload because it falls through to
          dynamic rendering. If <code>zeta</code> 404s instead, this app
          has <code>dynamicParams = false</code>.
        </p>
      }
    >
      <Evidence title="Pre-rendered (frozen)">
        <ul className="space-y-1">
          {["alpha", "beta", "gamma"].map((id) => (
            <li key={id}>
              <Link href={`/diagnostics/static-params/${id}`} className="text-blue-600 hover:underline">
                /diagnostics/static-params/{id}
              </Link>
            </li>
          ))}
        </ul>
      </Evidence>
      <Evidence title="Not pre-rendered (should be dynamic)">
        <ul className="space-y-1">
          <li>
            <Link href="/diagnostics/static-params/zeta" className="text-blue-600 hover:underline">
              /diagnostics/static-params/zeta
            </Link>
          </li>
        </ul>
      </Evidence>
    </TestPage>
  );
}
