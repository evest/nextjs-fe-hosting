import Link from "next/link";
import type { ReactNode } from "react";

export function TestPage({
  title,
  category,
  whatItTests,
  whyItMatters,
  howToInterpret,
  children,
}: {
  title: string;
  category: string;
  whatItTests: ReactNode;
  whyItMatters: ReactNode;
  howToInterpret: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <Link href="/diagnostics" className="text-sm text-blue-600 hover:underline">
          &larr; All diagnostics
        </Link>
        <p className="text-xs uppercase tracking-wide text-gray-500 mt-4">{category}</p>
        <h1 className="text-3xl font-bold mt-1">{title}</h1>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <h2 className="font-semibold text-gray-700 mb-2">What this tests</h2>
          <div className="text-gray-700 space-y-2">{whatItTests}</div>
        </div>
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <h2 className="font-semibold text-gray-700 mb-2">Why it matters</h2>
          <div className="text-gray-700 space-y-2">{whyItMatters}</div>
        </div>
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <h2 className="font-semibold text-gray-700 mb-2">How to interpret</h2>
          <div className="text-gray-700 space-y-2">{howToInterpret}</div>
        </div>
      </section>

      <section className="space-y-4">{children}</section>
    </div>
  );
}

export function Evidence({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border border-gray-300 p-4 bg-white">
      <h2 className="font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="space-y-2 text-sm font-mono">{children}</div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 items-baseline border-b border-gray-100 pb-1 last:border-0">
      <span className="text-gray-500 min-w-48">{label}</span>
      <span className="text-gray-900 break-all">{value}</span>
    </div>
  );
}
