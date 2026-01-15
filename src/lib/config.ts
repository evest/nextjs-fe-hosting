const DEFAULT_GRAPH_PATH = "/content/v2";

/**
 * Returns the Optimizely Graph gateway URL with the full path.
 *
 * In production (Frontend Hosting), the env var may be set to just the base URL:
 *   "https://cg.optimizely.com"
 *
 * Locally it includes the full path:
 *   "https://cg.optimizely.com/content/v2"
 *
 * This function ensures the full path is always present.
 * The path can be configured via OPTIMIZELY_GRAPH_PATH env var.
 */
export function getGraphGatewayUrl(): string {
  const gateway = process.env.OPTIMIZELY_GRAPH_GATEWAY;
  const graphPath = process.env.OPTIMIZELY_GRAPH_PATH || DEFAULT_GRAPH_PATH;

  if (!gateway) {
    throw new Error("OPTIMIZELY_GRAPH_GATEWAY environment variable is not set");
  }

  // If the gateway already ends with the path, return as-is
  if (gateway.endsWith(graphPath)) {
    return gateway;
  }

  // Remove trailing slash if present, then append the path
  const baseUrl = gateway.replace(/\/+$/, "");
  return `${baseUrl}${graphPath}`;
}
