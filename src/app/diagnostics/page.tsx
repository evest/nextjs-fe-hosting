import Link from "next/link";
import { TESTS } from "./_lib/shared";

export const metadata = {
  title: "Hosting Diagnostics",
};

export default function DiagnosticsIndex() {
  const groups = TESTS.reduce<Record<string, typeof TESTS>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Hosting Diagnostics</h1>
        <p className="text-gray-600 mt-2 text-sm leading-relaxed">
          Each test below exercises a specific Next.js / React feature against the
          running container, and reports whether the hosting environment supports
          it. Open each page for a description, live evidence, and a verdict.
          Reload pages a few times — many tests need multiple requests to be
          conclusive.
        </p>
      </header>

      {Object.entries(groups).map(([category, items]) => (
        <section key={category}>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">{category}</h2>
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/diagnostics/${t.slug}`}
                  className="block rounded border border-gray-200 bg-white p-4 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div className="font-semibold text-gray-900">{t.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{t.short}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="text-xs text-gray-500 pt-6 border-t border-gray-200">
        <p>
          These diagnostics are intentionally unauthenticated, matching the existing{" "}
          <Link href="/debug" className="text-blue-600 hover:underline">/debug</Link>{" "}
          endpoint. Gate them before exposing on a public production deploy.
        </p>
      </footer>
    </div>
  );
}
