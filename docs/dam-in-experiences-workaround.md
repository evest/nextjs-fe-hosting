# Workaround — render DAM assets inside experience compositions

> Companion to [dam-in-experiences-bug.md](./dam-in-experiences-bug.md).
> Apply this only if a demo or release deadline forces editors to use DAM
> in Visual Builder before Optimizely fixes the Graph resolver. **Remove
> it once the Graph fix is live** — every page render does N extra
> round-trips per DAM asset, and the `damAssets()` SDK helpers (e.g.
> `getAlt`) keep working natively once `item.AltText` is populated again.

## What the workaround does

When the SDK returns a DAM-backed `ContentReference` as
`{ key, url: { default: null }, item: { __typename: "Data" } }`, the
asset itself is still queryable directly. The workaround calls
`cmp_Asset(where: { Id: { eq: key } })` to fetch `Url`, `AltText`,
`Renditions`, etc. by key, and feeds the result into the same
`next/image` / alt-text flow components already use.

Cached indefinitely with `cacheLife('max')` and tagged
`opti-dam-asset`, so:

- N+1 collapses to N (one lookup per unique asset key per page render).
- A future webhook can blow the whole cache by calling
  `revalidateTag('opti-dam-asset')` once the Graph fix lands and you
  want to ditch the cached fallback URLs.

## Module to add

Create `src/lib/optimizely/dam-fallback.ts`:

```ts
/**
 * Workaround for an Optimizely Graph issue where DAM (`cmp_*`) assets
 * reached via `ContentReference.item` are returned as the bare `Data`
 * placeholder inside experience compositions. See
 * docs/dam-in-experiences-bug.md for the full reproducer.
 *
 * Symptom: a `contentReference` to a DAM asset comes back as
 *   { key, url: { default: null }, item: { __typename: "Data" } }
 * with no `Url`, `AltText`, or `Renditions`. `src()` from
 * `getPreviewUtils` therefore returns `undefined`.
 *
 * Remove this entire module once the Graph fix is live.
 */

import { getClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';

export const DAM_ASSET_CACHE_TAG = 'opti-dam-asset';

type DamAssetResolution = { url: string | null; altText: string | null };

const ASSET_QUERY = `
  query DamAssetById($id: String!) {
    cmp_Asset(where: { Id: { eq: $id } }) {
      items {
        __typename
        ... on cmp_PublicImageAsset { Url AltText }
        ... on cmp_PublicVideoAsset { Url AltText }
        ... on cmp_PublicRawFileAsset { Url }
      }
    }
  }
`;

type AssetResponse = {
  cmp_Asset?: {
    items?: Array<{ __typename: string; Url?: string | null; AltText?: string | null } | null> | null;
  } | null;
};

export async function resolveDamAssetByKey(key: string): Promise<DamAssetResolution> {
  'use cache';
  cacheLife('max');
  cacheTag(DAM_ASSET_CACHE_TAG);

  try {
    const client = getClient();
    const data = (await client.request(ASSET_QUERY, { id: key })) as AssetResponse;
    const item = data?.cmp_Asset?.items?.[0];
    if (!item) return { url: null, altText: null };
    return { url: item.Url ?? null, altText: item.AltText ?? null };
  } catch (e) {
    console.error('[dam-fallback] cmp_Asset lookup failed for key', key, e);
    return { url: null, altText: null };
  }
}

type AnyReference =
  | {
      key?: string | null;
      url?: { default?: string | null } | null;
      item?: { Url?: string | null; AltText?: string | null } | null;
    }
  | null
  | undefined;

export async function resolveAssetUrl(reference: AnyReference): Promise<string | null> {
  if (!reference) return null;
  const inline = reference.url?.default ?? reference.item?.Url;
  if (inline) return inline;
  if (!reference.key) return null;
  const { url } = await resolveDamAssetByKey(reference.key);
  return url;
}

export async function resolveAssetAlt(reference: AnyReference, fallback: string = ''): Promise<string> {
  if (!reference) return fallback;
  const inline = reference.item?.AltText;
  if (inline) return inline;
  if (reference.key) {
    const { altText } = await resolveDamAssetByKey(reference.key);
    if (altText) return altText;
  }
  return fallback;
}
```

## Wiring it into components

Each affected component needs three changes:

1. Make the component `async` (most are sync today).
2. Replace `src(image)` with `await resolveAssetUrl(image)`.
3. Replace `getAlt(image, fallback)` with `await resolveAssetAlt(image, fallback)`.

Keep using `pa()` from `getPreviewUtils` — that one is fine; it's only the asset-URL/alt path that's broken.

### Example diff — `src/components/blocks/TestimonialBlock.tsx`

```diff
- import { ContentProps, damAssets } from '@optimizely/cms-sdk';
+ import { ContentProps } from '@optimizely/cms-sdk';
  import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
+ import { resolveAssetUrl, resolveAssetAlt } from '@/lib/optimizely/dam-fallback';

- export default function TestimonialBlock({ content, displaySettings }: Props) {
-   const { pa, src } = getPreviewUtils(content);
-   const { getAlt } = damAssets(content);
+ export default async function TestimonialBlock({ content, displaySettings }: Props) {
+   const { pa } = getPreviewUtils(content);
    // ...build items array as before...

+   const resolved = await Promise.all(
+     visibleItems.map(async (item) => ({
+       ...item,
+       imgSrc: await resolveAssetUrl(item.image),
+       imgAlt: await resolveAssetAlt(item.image, item.name ?? ''),
+     })),
+   );

    return (
      // ...
-     {visibleItems.map((item) => {
-       const imgSrc = src(item.image);
+     {resolved.map((item) => {
+       const imgSrc = item.imgSrc;
        // ...
        {imgSrc && (
          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
-           <Image src={imgSrc} alt={getAlt(item.image, item.name ?? '')} fill sizes="48px" className="object-cover" />
+           <Image src={imgSrc} alt={item.imgAlt} fill sizes="48px" className="object-cover" />
          </div>
        )}
    );
  }
```

### Components to update

All of these call `src(contentReference)` where the reference can be a
DAM asset:

- `src/components/blocks/TestimonialBlock.tsx` (3 author images)
- `src/components/blocks/HeroBlock.tsx` (`backgroundImage`)
- `src/components/blocks/CardBlock.tsx` (`image`)
- `src/components/blocks/PartnerLogos.tsx` (array of `logos`)
- `src/components/elements/ImageElement.tsx` (`image`)
- `src/components/elements/BannerElement.tsx` (`backgroundImage`)
- `src/components/elements/PersonElement.tsx` (resolved person → image)
- `src/components/pages/PersonPage.tsx` (`image`)
- `src/components/pages/ArticlePage.tsx` (`featuredImage`) — already works
  for DAM today because it's not inside a composition, but applying the
  fallback is harmless and keeps the pattern consistent.
- `src/components/experiences/LandingPageExperience.tsx` (`backgroundImage`)

For array fields (`PartnerLogos.logos`), resolve in parallel with
`Promise.all(items.map(...))`. Don't loop with `for await` — that
serialises N round trips and visibly stalls the render.

## Verification after wiring

1. Hit `/diagnostics/raw-content?path=<page-with-DAM-block>` — confirm
   the broken shape is still being returned by Graph (so the workaround
   is doing real work, not masking a fix).
2. Render the page and confirm the DAM image appears.
3. Hit `/diagnostics/raw-content?assetKey=<key>` — confirm the asset's
   real URL matches what's now rendering.

## Removing the workaround later

When Optimizely confirms the Graph fix is deployed:

1. Hit `/diagnostics/raw-content?path=<a-page-with-DAM-in-an-experience>`.
   If `item.__typename` is `cmp_PublicImageAsset` with `Url` populated,
   the fix is live.
2. Revert the component changes (each becomes a pure sync function
   again, restoring `damAssets().getAlt` and `src()` usage).
3. Delete `src/lib/optimizely/dam-fallback.ts`.
4. Optional: call `revalidateTag('opti-dam-asset')` once via a hand-run
   admin route or `next-cli` to evict cached fallback URLs (otherwise
   they age out on their own; harmless because the URLs we cached are
   the same URLs the fix returns).
