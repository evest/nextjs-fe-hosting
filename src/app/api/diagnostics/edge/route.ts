export const runtime = "edge";

// Access process via globalThis so Turbopack doesn't statically flag a Node API
// usage. We don't actually need Node-only behavior here — we're probing whether
// process exists at runtime to detect the actual runtime in use.
type MaybeNodeProcess = {
  versions?: { node?: string };
};

// Cloudflare Workers expose a `cf` object on the request with colo, country,
// asn, and other request-time properties. Vercel Edge does not. Other hosts
// that run the edge-runtime sandbox on origin (potentially including Optimizely
// Frontend Hosting) also do not. Presence of `request.cf` is the cleanest
// single signal that the V8 isolate is executing inside Cloudflare Workers.
type CfProperties = {
  colo?: string;
  country?: string;
  city?: string;
  region?: string;
  continent?: string;
  asn?: number;
  asOrganization?: string;
  httpProtocol?: string;
  tlsVersion?: string;
};

const HEADERS_OF_INTEREST = [
  // Cloudflare adds these on every request that traverses its network. They
  // confirm Cloudflare is in front but NOT that it executed your code.
  "cf-ray",
  "cf-ipcountry",
  "cf-connecting-ip",
  "cf-worker",
  "cf-visitor",
  // Other CDN/edge fingerprints, useful to rule alternatives in/out.
  "x-vercel-id",
  "x-vercel-ip-country",
  "x-amz-cf-id",
  "x-amz-cf-pop",
  "fly-request-id",
  "x-forwarded-for",
  "via",
  "server",
  "x-powered-by",
];

export async function GET(request: Request) {
  const isEdge = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined";
  const proc = (globalThis as { process?: MaybeNodeProcess }).process;
  const nodeVersion = proc?.versions?.node ?? null;
  const hasNodeProcess = Boolean(nodeVersion);

  const requestHeaders: Record<string, string | null> = {};
  for (const name of HEADERS_OF_INTEREST) {
    requestHeaders[name] = request.headers.get(name);
  }

  // request.cf only exists when Cloudflare Workers is the runtime executing
  // this handler. A type assertion is needed because the standard Request
  // type does not declare it.
  const cf = (request as unknown as { cf?: CfProperties }).cf;
  const hasCfBinding = Boolean(cf);

  const cfRayHeader = requestHeaders["cf-ray"];
  const cfRayColo = cfRayHeader ? cfRayHeader.split("-")[1] ?? null : null;

  // Classify where this code is executing. The combination of cf-ray on the
  // incoming request AND a populated request.cf object is the only signature
  // that proves Cloudflare Workers ran the handler. Cloudflare-as-CDN-only
  // (cf-ray present, request.cf absent) means traffic passed through CF but
  // your code ran somewhere else — almost certainly Optimizely's origin.
  let executionHost:
    | "cloudflare-workers"
    | "cloudflare-cdn-only-origin-edge-runtime"
    | "edge-runtime-on-origin"
    | "nodejs-fallback"
    | "unknown";

  if (hasCfBinding) {
    executionHost = "cloudflare-workers";
  } else if (cfRayHeader && isEdge) {
    executionHost = "cloudflare-cdn-only-origin-edge-runtime";
  } else if (isEdge) {
    executionHost = "edge-runtime-on-origin";
  } else if (hasNodeProcess) {
    executionHost = "nodejs-fallback";
  } else {
    executionHost = "unknown";
  }

  return Response.json({
    declaredRuntime: "edge",
    actualRuntime: isEdge ? "edge" : hasNodeProcess ? "nodejs (fallback)" : "unknown",
    edgeRuntimeMarker: (globalThis as { EdgeRuntime?: string }).EdgeRuntime ?? null,
    hasNodeProcess,
    nodeVersion,
    executionHost,
    hasCfBinding,
    cf: cf ?? null,
    cfRayColo,
    requestHeaders,
    requestTime: new Date().toISOString(),
  });
}
