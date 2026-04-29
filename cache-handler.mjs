// Optimizely DXP shared Redis cache handler.
//
// Verbatim port of Optimizely's reference implementation from
// docs/isr-documentation.md §2.2. Avoid ESLint-cleaning this file —
// keeping it byte-for-byte aligned with the docs makes future updates
// trivially mergeable.

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
