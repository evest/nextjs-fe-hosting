# Next.js ISR Caching and Optimizely Graph Webhooks
This guide covers how to implement ISR (Incremental Static Regeneration) with Redis caching and Optimizely Graph webhook-based cache invalidation for an Optimizely Front-end running on the DXP platform.

Overview
The caching and invalidation flow works as follows:

ISR renders pages statically and caches them with a configurable revalidation interval

Redis stores the ISR cache, shared across all application instances

Optimizely Graph webhooks notify the frontend when content is published

The webhook handler invalidates the specific page in the ISR cache

CDN cache is purged via the Cloud Platform Services API

This ensures pages are served from cache for fast response times, while content updates are reflected within seconds of publishing. As a result, instead of rebuilding your entire site for every content change, updates can now be applied incrementally, improving performance, reducing build times, and making publishing workflows more efficient.

## 1. Next.js ISR Configuration
ISR allows pages to be statically generated and then revalidated in the background after a configurable interval. Set the revalidate export on any page to enable ISR:



// app/page.tsx
export const revalidate = 60; // revalidate every 60 seconds
export default async function Page() {
  const data = await fetchContent();
  return <div>{/* render content */}</div>;
}
For dynamic catch-all routes, use force-static to ensure pages are cached after the first render:



// app/[...slug]/page.tsx
export const revalidate = 60;
export const dynamic = "force-static";
Reference: Next.js ISR documentation

## 2. Redis Cache Handler
2.1. Why a Shared Cache is Needed
By default, Next.js stores the ISR cache on the local filesystem. When running multiple application instances behind a load balancer, each instance maintains its own cache. This means cache invalidation on one instance doesn't affect the others, leading to inconsistent content across requests.

A shared cache backend like Redis ensures all instances read from and write to the same cache, and that on-demand revalidation (via webhooks) immediately affects all instances.

Reference: Next.js Custom Cache Handler

2.2. Cache Handler Implementation
Create cache-handler.mjs at the project root. This is an example of a Cache Handler implementation:


```ts 
// cache-handler.mjs
import { createCluster } from "redis";
import { EntraIdCredentialsProviderFactory, REDIS_SCOPE_DEFAULT } from "@redis/entraid";
import { ManagedIdentityCredential } from "@azure/identity";
// Cache key prefix — namespaced per deployment slot to prevent collisions
const deploymentId = process.env.OPTIMIZELY_DXP_DEPLOYMENT_ID ?? "default";
const CACHE_PREFIX = `nextjs:${deploymentId}:`;
let cluster = null;
let connectionFailedUntil = 0;
// In-memory fallback when Redis is unavailable (local dev, connection failure)
const memoryCache = new Map();
async function getClient() {
  if (Date.now() < connectionFailedUntil) return null;
  if (cluster?.isOpen) return cluster;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  try {
    const result = await Promise.race([
      connectToRedis(redisUrl),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timeout (10s)")), 10000)
      ),
    ]);
    return result;
  } catch (err) {
    console.warn("Redis unavailable, falling back to in-memory cache:", err?.message);
    connectionFailedUntil = Date.now() + 60_000;
    cluster = null;
    return null;
  }
}
async function connectToRedis(redisUrl) {
  let host = redisUrl.replace(/^rediss?:\/\//, "");
  let port = 10000;
  if (host.includes(":")) {
    const parts = host.split(":");
    host = parts[0];
    port = parseInt(parts[1], 10);
  }
  if (!process.env.AZURE_CLIENT_ID) {
    throw new Error("Not running in Azure (no AZURE_CLIENT_ID) — Redis auth unavailable");
  }
  const clientId = process.env.AZURE_CLIENT_ID;
  const credentialsProvider = EntraIdCredentialsProviderFactory.createForDefaultAzureCredential({
    credential: new ManagedIdentityCredential({ clientId }),
    scopes: REDIS_SCOPE_DEFAULT,
    tokenManagerConfig: {
      expirationRefreshRatio: 0.8,
    },
  });
  const net = await import("node:net");
  cluster = createCluster({
    rootNodes: [{ url: `rediss://${host}:${port}` }],
    defaults: {
      credentialsProvider,
      socket: {
        connectTimeout: 5000,
        tls: true,
      },
    },
    nodeAddressMap: (address) => {
      const [hostOrIp, nodePort] = address.split(":");
      return {
        host: net.isIP(hostOrIp) !== 0 ? host : hostOrIp,
        port: Number(nodePort),
      };
    },
  });
  cluster.on("connect", () => {
    console.log("[cache] Redis cluster connected");
  });
  cluster.on("disconnect", () => {
    console.warn("[cache] Redis cluster disconnected");
  });
  cluster.on("error", (err) => {
    console.error("[cache] Redis cluster error:", err.message);
  });
  cluster.on("node-ready", (node) => {
    console.log(`[cache] Redis node ready (${node.host}:${node.port})`);
  });
  cluster.on("node-error", (err, node) => {
    console.error(`[cache] Redis node error (${node.host}:${node.port}):`, err.message);
  });
  cluster.on("node-reconnecting", (node) => {
    console.log(`[cache] Redis node reconnecting (${node.host}:${node.port})`);
  });
  await cluster.connect();
  return cluster;
}
async function withFallback(operation) {
  const redis = await getClient();
  if (!redis) return null;
  try {
    return await operation(redis);
  } catch (err) {
    console.error("[cache] Redis operation failed, using in-memory fallback:", err.message);
    return null;
  }
}
export async function getCluster() {
  await getClient();
  return cluster;
}
export default class CacheHandler {
  async get(key) {
    const result = await withFallback(async (redis) => {
      const raw = await redis.get(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      return { value: entry.value, lastModified: entry.lastModified };
    });
    return result ?? memoryCache.get(key) ?? null;
  }
  async set(key, value, context) {
    const tags = context?.tags ?? [];
    const entry = { value, lastModified: Date.now(), tags };
    const stored = await withFallback(async (redis) => {
      const serialized = JSON.stringify(entry);
      const ttl = context?.revalidate;
      if (ttl && typeof ttl === "number") {
        await redis.set(`${CACHE_PREFIX}${key}`, serialized, { EX: ttl });
      } else {
        await redis.set(`${CACHE_PREFIX}${key}`, serialized);
      }
      return true;
    });
    if (!stored) {
      memoryCache.set(key, entry);
    }
  }
  async revalidateTag(tags) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    const pathTags = tagList.filter(t => t.startsWith("_N_T_") && t !== "_N_T_/layout");
    const pathKeys = pathTags.map(t => {
      const path = t.replace("_N_T_", "");
      return `${CACHE_PREFIX}${path === "/" ? "/index" : path}`;
    });
    const purged = await withFallback(async (redis) => {
      for (const key of pathKeys) {
        await redis.del(key);
      }
      return true;
    });
    if (!purged) {
      for (const key of pathKeys) {
        const cacheKey = key.slice(CACHE_PREFIX.length);
        memoryCache.delete(cacheKey);
      }
    }
  }
  resetRequestCache() {
    // no-op for shared Redis cache
  }
}
```
The sections below explain the key design decisions in this file.

Redis Connection and Authentication
Redis is provisioned automatically on the DXP platform. Authentication uses Azure Managed Identity via @azure/identity's ManagedIdentityCredential. No connection strings or passwords are stored in configuration.

REDIS_URL contains the hostname and port (e.g. myredis.redis.azure.net:10000)

TLS is required (rediss:// scheme)

The connection is wrapped in a 10-second timeout to prevent startup hangs

When Redis is unavailable (local development), the handler falls back to an in-memory Map

Cache Key Namespacing
When multiple deployment slots share the same Redis instance, CACHE_PREFIX namespaces keys using OPTIMIZELY_DXP_DEPLOYMENT_ID to prevent collisions. This produces keys like nextjs:abc123:/index and nextjs:def456:/index for different slots, so cache invalidation in one slot doesn't affect another.

Cache Invalidation via revalidateTag
When Next.js calls revalidatePath(), it translates the path into internal tags prefixed with _N_T_. The _N_T_/layout tag is sent as a side effect with every call and is filtered out.

2.3. Configuring Next.js to Use the Cache Handler
In next.config.mjs, point cacheHandler to the handler file and disable the default in-memory LRU cache.

This will configure Next.js to use the Cache Handler which was defined above and cache data using Redis.



// next.config.mjs
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  cacheHandler: resolve(__dirname, "cache-handler.mjs"),
  cacheMaxMemorySize: 0,
};
export default nextConfig;
3. Optimizely Graph Webhooks
Optimizely Graph fires webhooks when published content is synced. These trigger on-demand ISR revalidation so that content updates appear on the site within seconds.

3.1. Webhook Registration
Webhooks are registered via the Optimizely Graph API at {gateway}/api/webhooks, authenticated with Basic auth using OPTIMIZELY_GRAPH_APP_KEY and OPTIMIZELY_GRAPH_SECRET. All these variables are preconfigured as part of the environment when deploying to Optimizely Front-end.

The recommended approach is automatic registration on application startup using the Next.js instrumentation hook. The registration is idempotent, it checks for existing webhooks before creating a new one and cleans up duplicates that may occur when multiple instances start concurrently.


```ts
// src/instrumentation.ts
export async function register() {
  const gateway = (process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com")
    .replace(/\/+$/, "");
  const appKey = process.env.OPTIMIZELY_GRAPH_APP_KEY;
  const secret = process.env.OPTIMIZELY_GRAPH_SECRET;
  const callbackApiKey = process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY;
  const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME;
  if (!appKey || !secret || !callbackApiKey || !hostname) return;
  const baseUrl = hostname.includes("://") ? hostname : `https://${hostname}`;
  const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/hooks/graph`;
  const webhooksEndpoint = `${gateway}/api/webhooks`;
  const auth = `Basic ${Buffer.from(`${appKey}:${secret}`).toString("base64")}`;
  try {
    // List existing webhooks
    const listRes = await fetch(webhooksEndpoint, { headers: { Authorization: auth } });
    if (!listRes.ok) throw new Error(`List webhooks failed (${listRes.status})`);
    const existing = await listRes.json();
    const matching = existing.filter((w: any) => w.request?.url === webhookUrl);
    // Deduplicate: if multiple webhooks exist for our URL,
    // keep the one with the highest ID and remove the rest
    if (matching.length > 1) {
      const sorted = [...matching].sort((a: any, b: any) => a.id.localeCompare(b.id));
      for (const hook of sorted.slice(0, -1)) {
        await fetch(`${webhooksEndpoint}/${hook.id}`, {
          method: "DELETE",
          headers: { Authorization: auth },
        });
      }
      return;
    }
    if (matching.length === 1) return; // already registered
    // Register new webhook
    await fetch(webhooksEndpoint, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        disabled: false,
        request: {
          url: webhookUrl,
          method: "post",
          headers: { "x-api-key": callbackApiKey },
        },
        topic: ["*.*"],
        filters: [{ status: { eq: "Published" } }],
      }),
    });
  } catch {
    // Non-fatal — the Graph API may be temporarily unavailable
  }
}
```

The webhook is registered with a filter for Published status and includes an x-api-key header that Optimizely Graph sends with each callback. This key is used by the callback handler to validate incoming requests.

3.2. Webhook Callback Handler
The callback endpoint receives POST requests from Content Graph when published content changes. It validates the request using the shared API key, resolves the content's URL path, invalidates the corresponding ISR cache entry, and purges the CDN cache for that URL.


```ts
// src/app/hooks/graph/route.ts
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
/** Resolve the path for a specific docId and revalidate it */
async function revalidateDocId(docId: string): Promise<string> {
  // docId format: {UUID}_{language}_Published
  const parts = docId.split("_");
  const id = parts[0].replaceAll("-", "");
  const locale = parts[1];
  const response = await graphRequest(`
    query GetPath($id: String, $locale: Locales) {
      _Content(ids: [$id], locale: [$locale]) {
        item { _metadata { url { default } } }
      }
    }
  `, { id, locale });
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
      // Replace this with the public-facing hostname which should have it's cache purged
      const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, "");
      if (hostname) {
        purgeCdnCache([`https://${hostname}${path}`]).catch((err) =>
          console.error("[hooks] CDN cache purge failed:", err.message)
        );
      }
    }
  }
  return NextResponse.json({ received: true });
}
```

This performs targeted invalidation, only the specific page that changed is revalidated and purged from the CDN, while all other cached pages remain unaffected. The cache purge-endpoint does take an array and multiple domains/paths can be purged.

This CDN purge example is using the default site hostname, ensure the hostname purged is the public-facing hostname.

4. CDN Cache Purge
The webhook callback handler purges the CDN cache for the specific URL that changed. The Cloud Platform Services API exposes an edge cache purge endpoint, authenticated with Azure Managed Identity.

Create src/lib/cdn-cache.ts:

```
// src/lib/cdn-cache.ts
import { ManagedIdentityCredential } from "@azure/identity";
const API_URL = (process.env.OPTIMIZELY_CLOUDPLATFORM_API_URL ?? "").replace(/\/+$/, "");
const RESOURCE_ID = process.env.OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID;
const SITE_HOSTNAME = process.env.OPTIMIZELY_SITE_HOSTNAME;
let cachedToken: { token: string; expiresAt: number } | null = null;
async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }
  const credential = process.env.AZURE_CLIENT_ID
    ? new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID })
    : new ManagedIdentityCredential();
  const response = await credential.getToken(`${RESOURCE_ID}/.default`);
  cachedToken = {
    token: response.token,
    expiresAt: response.expiresOnTimestamp,
  };
  return response.token;
}
/**
 * Purge CDN cache via the Cloud Platform Services edge-cache API.
 */
export async function purgeCdnCache(urls?: string[]): Promise<void> {
  if (!API_URL || !RESOURCE_ID) {
    console.warn("CDN cache purge skipped: API URL or resource ID not configured");
    return;
  }
  const purgeUrls = urls ?? (SITE_HOSTNAME
    ? [`https://${SITE_HOSTNAME.replace(/^https?:\/\//, "")}/`]
    : []);
  if (purgeUrls.length === 0) {
    console.warn("CDN cache purge skipped: no URLs to purge");
    return;
  }
  const token = await getToken();
  const res = await fetch(`${API_URL}/v1/edge-cache/purge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: purgeUrls }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CDN cache purge failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  console.log(`CDN cache purge accepted (operationId: ${data?.operationId})`);
}
```

The API returns 202 Accepted. The purge is asynchronous, the CDN processes it in the background and clears the cache within seconds. The callback as configured in this example will automatically clear the cache for the affected page when it is published in the CMS.

5. Environment Variables Reference
Set by the platform
These are provisioned automatically when deploying to the Optimizely DXP platform:

Variable

Description


OPTIMIZELY_GRAPH_SINGLE_KEY

Optimizely Graph read-only key for querying published content

OPTIMIZELY_GRAPH_GATEWAY

Optimizely Graph gateway URL (e.g. https://cg.optimizely.com)

OPTIMIZELY_GRAPH_APP_KEY

Optimizely Graph API key for webhook management (Basic auth)

OPTIMIZELY_GRAPH_SECRET

Optimizely Graph secret for webhook management (from Key Vault)

OPTIMIZELY_GRAPH_CALLBACK_APIKEY

Shared secret for authenticating incoming webhook requests (from Key Vault)

OPTIMIZELY_CMS_URL

CMS instance URL (e.g. https://app-abcd11111.cms.optimizely.com)

OPTIMIZELY_SITE_HOSTNAME

Public hostname of the site (e.g. mysite.example.com)

REDIS_URL

Azure Cache for Redis hostname and port (e.g. myredis.redis.azure.net:10000)

AZURE_CLIENT_ID

Managed identity client ID for Redis and CDN authentication

OPTIMIZELY_DXP_DEPLOYMENT_ID

Unique ID for the deployment slot, used for cache key namespacing

