// Verbatim port of Optimizely's reference implementation from
// docs/isr-documentation.md §4. Wraps the Cloud Platform Services
// edge-cache/purge API behind a managed-identity Bearer token.
//
// The API is asynchronous: it returns 202 Accepted with an operationId
// and processes the purge in the background. Callers should treat this
// as fire-and-forget.

import { ManagedIdentityCredential } from "@azure/identity";

const API_URL = (process.env.OPTIMIZELY_CLOUDPLATFORM_API_URL ?? "").replace(/\/+$/, "");
const RESOURCE_ID = process.env.OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID;
/**
 * Hostnames whose edge cache a publish should purge. Frontend Hosting sets
 * OPTIMIZELY_SITE_HOSTNAME to the environment's platform hostname
 * (epsa…dxcloud.episerver.net), not the custom domain visitors use
 * (dev/test/www.contentgurus.no), and it can't be overridden in the PaaS
 * Portal. The edge caches per hostname, so purge both: the platform hostname
 * and the public one from NEXT_PUBLIC_SITE_URL.
 */
export function purgeHostnames(): string[] {
  const hosts = new Set<string>();
  const platform = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (platform) hosts.add(platform);
  try {
    const pub = process.env.NEXT_PUBLIC_SITE_URL;
    if (pub) hosts.add(new URL(pub).host);
  } catch {
    // Malformed NEXT_PUBLIC_SITE_URL: purge the platform hostname only.
  }
  hosts.delete("localhost:3000");
  return [...hosts];
}

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
 * Returns when the API has accepted the request (202); the actual
 * purge happens asynchronously on the CDN.
 */
export async function purgeCdnCache(urls?: string[]): Promise<void> {
  if (!API_URL || !RESOURCE_ID) {
    console.warn("CDN cache purge skipped: API URL or resource ID not configured");
    return;
  }
  const purgeUrls = urls ?? purgeHostnames().map((host) => `https://${host}/`);
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
