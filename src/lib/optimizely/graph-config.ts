// Side-effect-only module that configures the Optimizely Graph client.
//
// `config()` must run before any `getClient()` call. The root layout gets this
// transitively via `import '@/optimizely'`, but standalone route handlers
// (llms.txt, llms-full.txt, sitemap, and their [locale] variants) do NOT go
// through the layout — they import the data-access libs directly. Without this,
// `getClient()` throws "Graph configuration is not set" in those routes.
//
// This module is intentionally minimal: it does NOT pull in the React component
// registry (unlike `@/optimizely`), so it's safe to import from data libs that
// run in the cache/runtime context. `config()` is module-cached, so importing
// this from many places runs it once.

import { config } from '@optimizely/cms-sdk';
import { getGraphGatewayUrl } from '@/lib/config';

if (process.env.OPTIMIZELY_GRAPH_SINGLE_KEY) {
  config({
    apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY,
    graphUrl: getGraphGatewayUrl(),
  });
}
