# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 frontend for Optimizely SaaS CMS using the Content JS SDK (`@optimizely/cms-sdk`). Deployed to Optimizely Frontend Hosting. Uses the App Router, React 19, Tailwind CSS 4, and TypeScript 5.

## Commands

```bash
npm run dev                  # Dev server with HTTPS (uses certificates/ dir)
npm run build                # Production build
npm run lint                 # ESLint (flat config, core-web-vitals + typescript)
npm run cms:login            # Authenticate with Optimizely CMS CLI
npm run cms:push-config      # Push content type definitions to CMS
npm run cms:push-config-force  # Force push (overwrites existing types)
```

Deploy via PowerShell: `.\deploy.ps1` (requires `OPTI_*` env vars in `.env`).

## Architecture

### SDK Initialization Flow

`src/optimizely.ts` is imported in the root layout and initializes three registries:
1. **Content Type Registry** — all content type definitions from `src/content-types/`
2. **Display Template Registry** — visual display options from `src/display-templates/`
3. **React Component Registry** — maps content type keys to React components

Every new content type requires registration in all three places plus `optimizely.config.mjs`.

### Content Routing

- `src/app/[...slug]/page.tsx` — Dynamic catch-all that fetches CMS content by URL path via `GraphClient.getContentByPath()` and renders with `<OptimizelyComponent>`
- `src/app/preview/page.tsx` — Visual Builder preview route for in-context editing
- `src/app/page.tsx` — Root `/` redirects to `/en`

### Content Type Definitions (`src/content-types/`)

Each file exports a `contentType()` call with a `CT` suffix (e.g., `CardBlockCT`). Two base types:
- `_page` — Page types (e.g., `ArticlePage`)
- `_component` — Blocks/elements with composition behaviors:
  - `sectionEnabled` — Can be placed in Visual Builder sections
  - `elementEnabled` — Can be placed as inline elements (restricted property types: no arrays with content, no component/json properties)

Content types are also registered as file paths (strings) in `optimizely.config.mjs` for the CMS CLI.

### Component Structure (`src/components/`)

Components are organized by their CMS role:
- `pages/` — Page type components
- `blocks/` — Reusable block components
- `elements/` — Atomic element components
- `experiences/` — Visual Builder wrappers (`BlankExperience`, `BlankSection`)
- `layout/` — Header, Footer, Logo

Barrel exports in `src/components/index.ts` must match content type keys used in `optimizely.ts` resolver.

### Component Pattern

```typescript
import { Infer } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  opti: Infer<typeof SomeContentTypeCT>;
  displaySettings?: Infer<typeof SomeDisplayTemplate>;
};

export default function MyComponent({ opti, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(opti);
  // pa('propertyName') — adds preview attributes for Visual Builder editing
  // src(opti.image) — returns optimized image URL from CMS CDN
  return <div {...pa('title')}>{opti.title}</div>;
}
```

### Display Templates vs Content Type Properties

Display templates (`src/display-templates/`) define **visual styling options** (alignment, heading level) shown in the CMS sidebar. Semantic data belongs in content type properties, not display templates.

## Adding a New Content Type (Checklist)

1. Create `src/content-types/NewType.ts` — define with `contentType()`, export as `NewTypeCT`
2. Export from `src/content-types/index.ts`
3. Create component in `src/components/{pages,blocks,elements}/NewType.tsx`
4. Export from `src/components/index.ts`
5. Add to resolver map in `src/optimizely.ts`
6. Add file path to `optimizely.config.mjs` components array
7. Run `npm run cms:push-config` to sync to CMS

## Environment Variables

Copy `.env.template` to `.env`. Key variables:
- `OPTIMIZELY_GRAPH_SINGLE_KEY` — Required for content fetching
- `OPTIMIZELY_CMS_URL` — CMS instance URL
- `OPTIMIZELY_GRAPH_GATEWAY` — Graph endpoint (defaults to `https://cg.optimizely.com`); handled by `src/lib/config.ts` `getGraphGatewayUrl()` which accounts for differences between local dev and Frontend Hosting runtime

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Image Domains

Remote images allowed from `*.cms.optimizely.com` and `cdn.optimizely.com` (configured in `next.config.ts`).
