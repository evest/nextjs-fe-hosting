import { Suspense } from 'react';
import { getClient } from '@optimizely/cms-sdk';
import '@/optimizely';
import CopyButton from './CopyButton';

// Captures the exact GraphQL query the SDK sends to Optimizely Graph
// when fetching a given page by path. We do this by intercepting the
// global fetch in this server component scope (Node fetch is global in
// Next.js 16), then calling getContentByPath() and inspecting what the
// SDK pushed through.
//
// Pass ?path=/en/about/ to capture the query for the working case, and
// ?path=/en/examples/ to capture the failing case. Compare side by side.

type Search = Promise<{ path?: string }>;

type Captured = { url: string; query: string; variables: unknown };

async function captureQueries(path: string): Promise<{ ok: true; captured: Captured[] } | { ok: false; error: string }> {
  const captured: Captured[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args: Parameters<typeof originalFetch>) => {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (init?.method === 'POST' && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        if (parsed?.query) {
          captured.push({ url, query: parsed.query, variables: parsed.variables ?? null });
        }
      } catch {
        // not JSON, ignore
      }
    }
    return originalFetch(...args);
  };
  try {
    const client = getClient();
    await client.getContentByPath(path);
    return { ok: true, captured };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function CaptureResult({ searchParams }: { searchParams: Search }) {
  const { path } = await searchParams;
  if (!path) return null;
  const result = await captureQueries(path);
  if (!result.ok) {
    return (
      <pre className="rounded border border-red-300 bg-red-50 p-4 text-xs overflow-auto">
        Error: {result.error}
      </pre>
    );
  }
  if (result.captured.length === 0) {
    return <p className="text-sm text-gray-500">No GraphQL requests were captured for this path.</p>;
  }
  return (
    <div className="space-y-6">
      {result.captured.map((c, i) => {
        const variablesText = JSON.stringify(c.variables, null, 2);
        const fullPayload = JSON.stringify({ query: c.query, variables: c.variables }, null, 2);
        return (
          <div key={i} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-gray-500 font-mono flex-1">Request #{i + 1} → {c.url}</div>
              <CopyButton text={fullPayload} label="Copy query + variables" />
              <CopyButton text={c.query} label="Copy query" />
              <CopyButton text={variablesText} label="Copy variables" />
            </div>
            <details className="rounded border border-gray-200 bg-gray-50 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-gray-700">Variables</summary>
              <pre className="text-xs overflow-auto p-2">{variablesText}</pre>
            </details>
            <pre className="rounded border border-gray-300 bg-white p-4 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
              {c.query}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

async function PathInput({ searchParams }: { searchParams: Search }) {
  const { path } = await searchParams;
  return (
    <input
      name="path"
      defaultValue={path ?? ''}
      placeholder="/en/about/"
      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-mono"
    />
  );
}

export default function SdkQueryPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">CMS</p>
        <h1 className="text-3xl font-bold mt-1">SDK query capture</h1>
        <p className="mt-3 text-gray-600 text-sm leading-relaxed">
          Calls <code>getContentByPath(path)</code> and captures every
          GraphQL request the SDK fires (including the metadata probe and
          the main content query). Use this to compare query shape
          between a working DAM page and a failing one.
        </p>
      </header>

      <form className="flex gap-2" action="">
        <Suspense fallback={<input className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-mono" />}>
          <PathInput searchParams={searchParams} />
        </Suspense>
        <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold">
          Capture
        </button>
      </form>

      <Suspense fallback={<div className="text-sm text-gray-500">Capturing…</div>}>
        <CaptureResult searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
