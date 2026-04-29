// Optimizely Graph webhook receiver.
//
// Verbatim port of the reference implementation from
// docs/isr-documentation.md §3.2. Authenticates the incoming request
// via the x-api-key header, resolves the published docId back to a URL
// path, calls revalidatePath() to invalidate the Next.js cache, and
// fires a CDN purge for the affected URL.
//
// Always returns 200 (with `received: true` or an `error` field) so
// Optimizely doesn't retry on transient downstream failures.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { purgeCdnCache } from "@/lib/cdn-cache";

const CALLBACK_API_KEY = process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY;
const singleKey = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!;
const gateway = (process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com").replace(/\/+$/, "");
const graphUrl = `${gateway}/content/v2`;

async function graphRequest(query: string, variables: Record<string, unknown>) {
  const res = await fetch(graphUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `epi-single ${singleKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

/** Resolve the path for a specific docId and revalidate it. Returns the
 *  resolved path (without trailing slash) on success, or "" if the doc
 *  cannot be resolved.
 *
 *  docId format: `{UUID}_{language}_Published` */
async function revalidateDocId(docId: string): Promise<string> {
  const parts = docId.split("_");
  const id = parts[0].replaceAll("-", "");
  const locale = parts[1];
  const response = await graphRequest(
    `
    query GetPath($id: String, $locale: Locales) {
      _Content(ids: [$id], locale: [$locale]) {
        item { _metadata { url { default } } }
      }
    }
  `,
    { id, locale },
  );
  const url = response?._Content?.item?._metadata?.url?.default;
  if (!url) return "";
  const path = url.endsWith("/") ? url.slice(0, -1) : url;
  revalidatePath(path || "/");
  return path || "/";
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!CALLBACK_API_KEY || apiKey !== CALLBACK_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.json();
  const { subject, action } = payload.type;
  if (subject === "doc" && (action === "updated" || action === "expired")) {
    const path = await revalidateDocId(payload.data.docId);
    if (path) {
      // Replace this with the public-facing hostname which should have its
      // cache purged. The cache purge endpoint takes an array and multiple
      // domains/paths can be purged.
      const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, "");
      if (hostname) {
        purgeCdnCache([`https://${hostname}${path}`]).catch((err) =>
          console.error("[hooks] CDN cache purge failed:", err.message),
        );
      }
    }
  }
  return NextResponse.json({ received: true });
}
