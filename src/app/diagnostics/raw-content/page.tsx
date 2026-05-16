import { Suspense } from 'react';
import { getClient } from '@optimizely/cms-sdk';

// Dumps the raw GraphClient response so we can inspect the shape of
// contentReference / DAM asset fields. Pass ?path=/en/foo to probe a
// page, or ?assetKey=<key> to probe a single cmp_Asset directly.
//
// Under cacheComponents, every `await searchParams` must live inside a
// <Suspense> boundary so the static shell can prerender.

type Search = Promise<{ path?: string; assetKey?: string }>;

// Query the asset two ways and let the page render both errors and data
// side-by-side. The schema names for the asset collection field vary by
// Graph version, so we also include a generic _Content fallback that uses
// the key.

const ASSET_QUERY_DIRECT = `
  query ProbeAssetDirect($key: String!) {
    cmp_Asset(where: { _metadata: { key: { eq: $key } } }) {
      items {
        __typename
        ... on cmp_PublicImageAsset {
          Url
          Title
          AltText
          Width
          Height
          MimeType
          Renditions { Id Name Url Width Height }
        }
        ... on cmp_PublicVideoAsset {
          Url
          Title
          AltText
          MimeType
          Renditions { Id Name Url Width Height }
        }
        ... on cmp_PublicRawFileAsset {
          Url
          Title
          MimeType
        }
      }
    }
  }
`;

const ASSET_QUERY_VIA_CONTENT = `
  query ProbeAssetViaContent($key: String!) {
    _Content(where: { _metadata: { key: { eq: $key } } }) {
      items {
        __typename
        _metadata { key types displayName }
        ... on cmp_PublicImageAsset {
          Url
          Title
          AltText
          Width
          Height
          Renditions { Id Name Url Width Height }
        }
      }
    }
  }
`;

async function fetchByPath(path: string) {
  try {
    const client = getClient();
    const items = await client.getContentByPath(path);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchAssetWith(query: string, key: string) {
  try {
    const client = getClient();
    const data = await client.request(query, { key });
    return { ok: true as const, data };
  } catch (e) {
    const errors = (e as { errors?: unknown }).errors;
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error: errors ? `${message}\n\n${JSON.stringify(errors, null, 2)}` : message,
    };
  }
}

function Dump({ value }: { value: unknown }) {
  return (
    <pre className="rounded border border-gray-300 bg-white p-4 text-xs overflow-auto max-h-[80vh]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <pre className="rounded border border-red-300 bg-red-50 p-4 text-xs overflow-auto">
      Error: {error}
    </pre>
  );
}

async function PathSection({ searchParams }: { searchParams: Search }) {
  const { path } = await searchParams;
  if (!path) return null;
  const result = await fetchByPath(path);
  return result.ok ? <Dump value={result.items} /> : <ErrorBox error={result.error} />;
}

async function AssetSection({ searchParams }: { searchParams: Search }) {
  const { assetKey } = await searchParams;
  if (!assetKey) return null;
  const [direct, viaContent] = await Promise.all([
    fetchAssetWith(ASSET_QUERY_DIRECT, assetKey),
    fetchAssetWith(ASSET_QUERY_VIA_CONTENT, assetKey),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase text-gray-600 mb-1">Direct (cmp_Asset)</h3>
        {direct.ok ? <Dump value={direct.data} /> : <ErrorBox error={direct.error} />}
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase text-gray-600 mb-1">Via _Content (with cmp_PublicImageAsset inline fragment)</h3>
        {viaContent.ok ? <Dump value={viaContent.data} /> : <ErrorBox error={viaContent.error} />}
      </div>
    </div>
  );
}

async function PathInput({ searchParams }: { searchParams: Search }) {
  const { path } = await searchParams;
  return (
    <input
      name="path"
      defaultValue={path ?? ''}
      placeholder="/en/your-page/"
      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-mono"
    />
  );
}

async function AssetInput({ searchParams }: { searchParams: Search }) {
  const { assetKey } = await searchParams;
  return (
    <input
      name="assetKey"
      defaultValue={assetKey ?? ''}
      placeholder="asset key"
      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-mono"
    />
  );
}

export default function RawContentPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">CMS</p>
        <h1 className="text-3xl font-bold mt-1">Raw content probe</h1>
        <p className="mt-3 text-gray-600 text-sm leading-relaxed">
          Two modes: probe a page by URL, or probe a DAM asset by key.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800 text-sm">By page path</h2>
        <form className="flex gap-2" action="">
          <Suspense fallback={<input className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-mono" />}>
            <PathInput searchParams={searchParams} />
          </Suspense>
          <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold">
            Probe page
          </button>
        </form>
        <Suspense fallback={<div className="text-sm text-gray-500">Querying Graph…</div>}>
          <PathSection searchParams={searchParams} />
        </Suspense>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800 text-sm">By DAM asset key</h2>
        <p className="text-xs text-gray-500">
          Use the <code>key</code> field from a <code>contentReference</code> in the page probe above
          (e.g. <code>9ca84b24459f11f1a230e6236cfa29fc</code>) to fetch the asset directly.
        </p>
        <form className="flex gap-2" action="">
          <Suspense fallback={<input className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-mono" />}>
            <AssetInput searchParams={searchParams} />
          </Suspense>
          <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold">
            Probe asset
          </button>
        </form>
        <Suspense fallback={<div className="text-sm text-gray-500">Querying Graph…</div>}>
          <AssetSection searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}
