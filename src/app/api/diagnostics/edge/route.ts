export const runtime = "edge";

// Access process via globalThis so Turbopack doesn't statically flag a Node API
// usage. We don't actually need Node-only behavior here — we're probing whether
// process exists at runtime to detect the actual runtime in use.
type MaybeNodeProcess = {
  versions?: { node?: string };
};

export async function GET() {
  const isEdge = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined";
  const proc = (globalThis as { process?: MaybeNodeProcess }).process;
  const nodeVersion = proc?.versions?.node ?? null;
  const hasNodeProcess = Boolean(nodeVersion);

  return Response.json({
    declaredRuntime: "edge",
    actualRuntime: isEdge ? "edge" : hasNodeProcess ? "nodejs (fallback)" : "unknown",
    edgeRuntimeMarker: (globalThis as { EdgeRuntime?: string }).EdgeRuntime ?? null,
    hasNodeProcess,
    nodeVersion,
    requestTime: new Date().toISOString(),
  });
}
