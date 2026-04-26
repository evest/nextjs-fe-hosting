import { cache } from "react";

// Per-request stable timestamp. React's purity lint forbids calling Date.now()
// directly in a component body; wrapping it in `cache()` makes it idempotent
// within a single request, which is exactly what these diagnostics want.
export const requestNow = cache(() => Date.now());

// Captured the first time this module is evaluated.
//
// In a statically-rendered (SSG) page that imports this, evaluation happens
// at `next build` time, so the value is frozen into the HTML.
//
// In a dynamic (SSR) page, evaluation happens when the Node.js process starts
// inside the container, so the value reflects container start time.
//
// Comparing this against `Date.now()` at request time is what tells us which
// mode actually rendered the page.
export const MODULE_LOAD_TIME = Date.now();

// Stable per-process random ID. Lets you spot whether two requests were served
// by the same container instance (helpful when verifying multi-replica caching).
export const PROCESS_ID = Math.random().toString(36).slice(2, 10);

export type Verdict = "pass" | "warn" | "fail" | "manual" | "unknown";

export type DiagnosticTest = {
  slug: string;
  title: string;
  category: string;
  short: string;
};

export const TESTS: DiagnosticTest[] = [
  { slug: "runtime", title: "Runtime info", category: "A. Environment", short: "Node, Next, React versions and process state." },
  { slug: "build", title: "Build info", category: "A. Environment", short: "Build-time stamp baked into the HTML." },
  { slug: "ssg", title: "SSG (Static Generation)", category: "B. Rendering", short: "Page rendered at build, served from disk/CDN." },
  { slug: "ssr", title: "SSR (Server Rendering)", category: "B. Rendering", short: "Rendered on every request inside the container." },
  { slug: "isr", title: "ISR (Incremental Static Regeneration)", category: "B. Rendering", short: "Static page that auto-refreshes on a schedule." },
  { slug: "static-params", title: "generateStaticParams", category: "B. Rendering", short: "Pre-rendering parameterised dynamic routes." },
  { slug: "ppr", title: "PPR (Partial Prerendering)", category: "B. Rendering", short: "Static shell + dynamic Suspense holes." },
  { slug: "use-cache", title: "'use cache' directive", category: "C. Caching", short: "Next.js 15+ explicit cache for server functions." },
  { slug: "fetch-cache", title: "fetch() data cache", category: "C. Caching", short: "Per-fetch revalidate option for upstream data." },
  { slug: "on-demand", title: "On-demand revalidation", category: "C. Caching", short: "revalidateTag/revalidatePath across replicas." },
  { slug: "streaming", title: "Streaming with Suspense", category: "D. React 19", short: "Sends HTML in chunks as data resolves." },
  { slug: "server-actions", title: "Server Actions", category: "D. React 19", short: "POST handlers declared inline as 'use server'." },
  { slug: "middleware", title: "Middleware", category: "E. Edge", short: "Edge function that runs before every request." },
  { slug: "edge", title: "Edge runtime route", category: "E. Edge", short: "Route handler declared as runtime='edge'." },
  { slug: "image", title: "next/image optimization", category: "F. Other", short: "Image transformer at /_next/image." },
  { slug: "draft", title: "Draft mode", category: "F. Other", short: "Cookie-based preview bypass." },
];

export function formatStamp(ts: number | string): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

// Caller must pass `nowMs` — Date.now() default would trigger in prerender
// contexts where cacheComponents disallows reading the current time.
export function ageHuman(thenMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - thenMs);
  if (diff < 1000) return `${diff} ms`;
  if (diff < 60_000) return `${(diff / 1000).toFixed(1)} s`;
  if (diff < 3_600_000) return `${(diff / 60_000).toFixed(1)} min`;
  if (diff < 86_400_000) return `${(diff / 3_600_000).toFixed(1)} h`;
  return `${(diff / 86_400_000).toFixed(1)} d`;
}
