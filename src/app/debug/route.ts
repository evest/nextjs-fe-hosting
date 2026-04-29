import { NextResponse } from "next/server";
import { getGraphGatewayUrl } from "@/lib/config";

// SECURITY NOTE: this endpoint is intentionally unauthenticated for
// quick debugging during DXP rollout. Every value is either masked or
// classified as non-sensitive (e.g. public hostnames, deployment slot
// IDs). DO NOT add secrets here without masking. Consider gating
// behind a header check or removing entirely before public production
// launch.

/** Mask: show first 4 + last 4 chars; everything else as ***. */
function maskValue(value: string | undefined): string {
  if (!value) return "(not set)";
  if (value.length <= 8) return "***" + value.slice(-2);
  return value.slice(0, 4) + "***" + value.slice(-4);
}

/** Boolean presence: just say whether it's set, never leak the value. */
function presence(value: string | undefined): string {
  return value ? "(set)" : "(not set)";
}

/** Public: show as-is. Use only for non-sensitive identifiers/URLs. */
function publicValue(value: string | undefined): string {
  return value ?? "(not set)";
}

export async function GET() {
  // Resolve the Graph gateway URL via the same helper the app uses, but
  // don't crash the route if the env is incomplete.
  let resolvedGraphGateway: string;
  try {
    resolvedGraphGateway = getGraphGatewayUrl();
  } catch (err) {
    resolvedGraphGateway = `(error: ${err instanceof Error ? err.message : String(err)})`;
  }

  // Each variable is classified into one of three groups by sensitivity:
  //   public — full value shown (URLs, hostnames, slot IDs)
  //   masked — first/last 4 chars only (API keys, secrets, client IDs)
  //   present — boolean only (tenant identifiers we don't want to leak)
  //
  // The classification is deliberate per-var; please don't bulk-promote
  // anything from `present` to `masked` or `masked` to `public` without
  // checking what's in the value.

  const env = {
    // ── Optimizely Graph (read access) ────────────────────────────
    OPTIMIZELY_GRAPH_GATEWAY: publicValue(process.env.OPTIMIZELY_GRAPH_GATEWAY),
    OPTIMIZELY_GRAPH_GATEWAY_RESOLVED: resolvedGraphGateway,
    OPTIMIZELY_GRAPH_PATH: publicValue(process.env.OPTIMIZELY_GRAPH_PATH),
    OPTIMIZELY_GRAPH_SINGLE_KEY: maskValue(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY),

    // ── Optimizely Graph (webhook management — Basic auth) ─────────
    OPTIMIZELY_GRAPH_APP_KEY: maskValue(process.env.OPTIMIZELY_GRAPH_APP_KEY),
    OPTIMIZELY_GRAPH_SECRET: maskValue(process.env.OPTIMIZELY_GRAPH_SECRET),

    // ── Webhook receiver auth (this app implements /hooks/graph) ───
    OPTIMIZELY_GRAPH_CALLBACK_APIKEY: maskValue(process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY),

    // ── Optimizely CMS API ────────────────────────────────────────
    OPTIMIZELY_CMS_URL: publicValue(process.env.OPTIMIZELY_CMS_URL),
    OPTIMIZELY_CMS_CLIENT_ID: maskValue(process.env.OPTIMIZELY_CMS_CLIENT_ID),
    OPTIMIZELY_CMS_CLIENT_SECRET: maskValue(process.env.OPTIMIZELY_CMS_CLIENT_SECRET),

    // ── Site identity ─────────────────────────────────────────────
    OPTIMIZELY_SITE_HOSTNAME: publicValue(process.env.OPTIMIZELY_SITE_HOSTNAME),

    // ── DXP deployment / Azure managed identity ───────────────────
    OPTIMIZELY_DXP_DEPLOYMENT_ID: maskValue(process.env.OPTIMIZELY_DXP_DEPLOYMENT_ID),
    AZURE_CLIENT_ID: maskValue(process.env.AZURE_CLIENT_ID),

    // ── Redis cache handler ───────────────────────────────────────
    REDIS_URL: maskValue(process.env.REDIS_URL),

    // ── Cloud Platform Services CDN purge API ─────────────────────
    // Referenced in cdn-cache.ts §4 of the official ISR doc but
    // missing from §5's env-var table — added here so we can verify
    // they're populated on each environment.
    OPTIMIZELY_CLOUDPLATFORM_API_URL: publicValue(process.env.OPTIMIZELY_CLOUDPLATFORM_API_URL),
    OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID: maskValue(process.env.OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID),

    // ── Deployment credentials (deploy.ps1 / opticloud) ───────────
    OPTI_PROJECT_ID: maskValue(process.env.OPTI_PROJECT_ID),
    OPTI_TARGET_ENV: publicValue(process.env.OPTI_TARGET_ENV),
    OPTI_CLIENT_KEY: maskValue(process.env.OPTI_CLIENT_KEY),
    OPTI_CLIENT_SECRET: maskValue(process.env.OPTI_CLIENT_SECRET),

    // ── Process / runtime ─────────────────────────────────────────
    NODE_ENV: publicValue(process.env.NODE_ENV),
    NEXT_RUNTIME: publicValue(process.env.NEXT_RUNTIME),
    NEXT_PHASE: publicValue(process.env.NEXT_PHASE),
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: env,
  });
}
