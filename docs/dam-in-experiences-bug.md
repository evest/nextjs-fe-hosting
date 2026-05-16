# Bug report — DAM (`cmp_*`) assets not resolving inside experience compositions

## Summary

Optimizely Graph returns DAM (`cmp_PublicImageAsset` / `cmp_PublicVideoAsset` / `cmp_PublicRawFileAsset`) records as the bare `Data` interface placeholder — with **no asset fields populated** — when the asset is referenced from a `ContentReference` field inside a `_IExperience.composition` tree. The same query against the same asset returns the correct concrete subtype with all fields populated when the reference is on a top-level `ArticlePage` field.

The DAM asset itself is indexed correctly; it can be fetched directly via `cmp_Asset(where: { Id: { eq: <key> } })` and returns full data. Only the `ContentReference.item` resolver, when reached through a deeply-nested fragment chain, fails to materialize it as a concrete subtype.

This blocks DAM in Visual Builder: editors can place a DAM asset on a block (e.g. `TestimonialBlock.author1Image`, `ImageElement.image`) inside an experience, but the frontend cannot render it because `item.Url`, `item.AltText`, `item.Renditions`, etc. are all missing from the response.

## Environment

- SDK: `@optimizely/cms-sdk@^2.0.0` (installed 2.0.0)
- Graph endpoint: `https://cg.optimizely.com/content/v2`
- CMS instance: Optimizely SaaS CMS (with DAM enabled — `cmp_Asset` type present in schema)

## Reproducer

Two pages, same DAM asset, different containers.

### Page A — `/en/about/` (ArticlePage with `featuredImage`) — **works**

DAM asset key: `0d1b72b006a711f191b49a873a125d55`

The SDK auto-generates this query (captured by intercepting `fetch`):

```graphql
fragment PublicImageAsset on cmp_PublicImageAsset { Url Title AltText Description MimeType Height Width Renditions { Id Name Url Width Height } FocalPoint { X Y } Tags { Guid Name } }
fragment PublicVideoAsset on cmp_PublicVideoAsset { Url Title AltText Description MimeType Renditions { Id Name Url Width Height } Tags { Guid Name } }
fragment PublicRawFileAsset on cmp_PublicRawFileAsset { Url Title Description MimeType Tags { Guid Name } }
fragment ContentReferenceItem on ContentReference { item { __typename ...PublicImageAsset ...PublicVideoAsset ...PublicRawFileAsset } }
fragment ContentUrl on ContentUrl { type default hierarchical internal graph base }
# ...metadata fragments omitted for brevity...
fragment ArticlePage on ArticlePage {
  __typename
  ArticlePage__heading: heading
  ArticlePage__body: body { html, json }
  featuredImage { key url { ...ContentUrl } ...ContentReferenceItem }
  # ...
  ..._IContent
}
query ListContent($where: _ContentWhereInput, $variation: VariationInput) {
  _Content(where: $where, variation: $variation) {
    items { ...ArticlePage _metadata { variation } }
  }
}
```

Response (relevant fragment):

```json
"featuredImage": {
  "key": "0d1b72b006a711f191b49a873a125d55",
  "url": { "default": null, "...": "..." },
  "item": {
    "__typename": "cmp_PublicImageAsset",
    "Url": "https://images2.cmp.optimizely.com/assets/Opal+AI+Avatar+Generated/Zz0wZDFiNzJiMDA2YTcxMWYxOTFiNDlhODczYTEyNWQ1NQ==",
    "AltText": null,
    "Width": 1024,
    "Height": 1024,
    "Renditions": [ /* … 4 entries with real Url/Width/Height … */ ]
  }
}
```

`item.__typename` is the concrete `cmp_PublicImageAsset` and all selected fields are populated. ✅

### Page B — `/en/works-not/` (BlankExperience with `ImageElement` in composition) — **fails**

Same DAM asset placed on `ImageElement.image` inside a `BlankExperience` composition. The SDK auto-generates the same DAM fragments — `PublicImageAsset`, `PublicVideoAsset`, `PublicRawFileAsset`, `ContentReferenceItem` — and spreads `ContentReferenceItem` on the element's image field identically:

```graphql
fragment _IExperience on _IExperience { composition { ...ICompositionNode } }
fragment ICompositionNode on ICompositionNode {
  __typename key type nodeType layoutType displayName displayTemplateKey displaySettings { key value }
  ... on CompositionStructureNode { nodes @recursive }
  ... on CompositionComponentNode { nodeType component { ..._IComponent } }
}
fragment _IComponent on _IComponent { __typename ...AccordionBlock ... ...ImageElement ... ...TestimonialBlock ... }
fragment ImageElement on ImageElement {
  __typename
  image { key url { ...ContentUrl } ...ContentReferenceItem }
  ImageElement__altText: altText
  ImageElement__caption: caption
  ..._IContent
}
fragment BlankExperience on BlankExperience { __typename ..._IContent ..._IExperience }
query ListContent($where: _ContentWhereInput, $variation: VariationInput) {
  _Content(where: $where, variation: $variation) {
    items { ...BlankExperience _metadata { variation } }
  }
}
```

Response (relevant fragment):

```json
"component": {
  "__typename": "ImageElement",
  "image": {
    "key": "9ca84b24459f11f1a230e6236cfa29fc",
    "url": { "default": null, "...": "..." },
    "item": { "__typename": "Data" }
  }
}
```

`item.__typename` is `Data` — the bare interface placeholder — and **no asset fields are present**. ❌

The fragment definitions are in the document, but the resolver does not appear to apply `... on cmp_PublicImageAsset` / `... on cmp_PublicVideoAsset` / `... on cmp_PublicRawFileAsset` at this depth.

### Asset itself is fine

Direct query against the failing key resolves correctly:

```graphql
{
  cmp_Asset(where: { Id: { eq: "9ca84b24459f11f1a230e6236cfa29fc" } }) {
    items {
      __typename
      ... on cmp_PublicImageAsset { Url AltText Width Height Renditions { Url Width Height } }
    }
  }
}
```

Response:

```json
{
  "data": {
    "cmp_Asset": {
      "items": [{
        "__typename": "cmp_PublicImageAsset",
        "Url": "https://images1.cmp.optimizely.com/assets/banner.png/Zz05Y2E4NGIyNDQ1OWYxMWYxYTIzMGU2MjM2Y2ZhMjlmYw==",
        "AltText": null,
        "Width": 1024,
        "Height": 1024,
        "Renditions": [ /* … 4 entries … */ ]
      }]
    }
  }
}
```

So the asset is indexed correctly and *can* be resolved as a concrete subtype — just not through `ContentReference.item` inside an experience composition.

## Fragment chain depth

The two cases differ only in how deeply nested the `item` interface resolution sits inside fragment spreads:

| Hop | Working (ArticlePage)                          | Failing (BlankExperience → ImageElement)                  |
| --- | ---------------------------------------------- | --------------------------------------------------------- |
| 1   | `_Content.items → ArticlePage` (concrete)      | `_Content.items → BlankExperience` (concrete)             |
| 2   | `featuredImage` (ContentReference)             | `composition` (`_IExperience` → `ICompositionNode` interface) |
| 3   | `item` (`IData` interface → `cmp_PublicImageAsset`) | `nodes @recursive` (interface, recursed)                |
| 4   |                                                | `component` (`_IComponent` interface → `ImageElement` concrete) |
| 5   |                                                | `image` (ContentReference)                                |
| 6   |                                                | `item` (`IData` interface → `cmp_PublicImageAsset`)       |

Working case resolves the `IData` interface 1 hop from the root. Failing case is 5 hops in, behind `@recursive` and three other interface→concrete jumps.

## Hypothesis

Graph's `@recursive` directive (or its interface-resolution pipeline beneath nested fragment spreads) doesn't carry the document-level `... on cmp_PublicImageAsset` inline-fragment definitions through to the `ContentReference.item` resolver at this depth. The resolver falls back to returning the bare `Data` placeholder type because no concrete-subtype match is registered in scope.

This would mean ANY DAM-backed `contentReference` field on any block inside an experience composition is broken — not just `ImageElement`. We've confirmed this on `ImageElement.image` (the reproducer above, page `/en/works-not/`) and observed the same broken shape on `TestimonialBlock.author1Image` on a separate page (`/en/examples/`).

## Impact

DAM cannot be used inside Visual Builder experiences. Every block that exposes an image/video/file `contentReference` field is affected: `TestimonialBlock`, `ImageElement`, `HeroBlock`, `CardBlock`, `BannerElement`, `PartnerLogos`, `PersonElement`, `PageCardElement` — anything composed inside an experience.

Editors who select a DAM asset see nothing render on the published page. Regular CMS-library images work because they populate `url.default`, which the SDK's `src()` helper falls back to.

## Workarounds considered

- **Runtime fallback** — when `item.__typename === "Data"` but `key` is set, do a second `cmp_Asset(where: { Id: { eq: <key> } })` lookup. Works (the asset is queryable directly), but adds N extra round trips per page and requires every component to become async. We have NOT shipped this — preference is to wait for the Graph fix.
- **Editor guidance** — tell editors to use CMS-library images, not DAM, for blocks inside experiences. Stopgap only; defeats the point of having DAM.

## Reproduction tools in this repo

- `/diagnostics/raw-content?path=<path>` — dumps the raw SDK response for a given page path. Also `?assetKey=<key>` to query the asset directly via `cmp_Asset`.
- `/diagnostics/sdk-query?path=<path>` — intercepts `fetch` and captures every GraphQL query the SDK fires for a given page. Includes "Copy query + variables" buttons for easy paste.

Both pages are linked from `/diagnostics`.

## Request

Please:

1. Confirm whether this is a Graph engine bug or a documented limitation of `@recursive` we missed.
2. If a bug — fix the interface resolution for `ContentReference.item` inside recursive composition fragments.
3. If a limitation — document it and recommend the correct query shape we should be generating instead. The SDK auto-generates the query; if a different shape is needed, the SDK needs the same fix.
