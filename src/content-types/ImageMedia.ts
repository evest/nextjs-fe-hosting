// Minimal content-type registration for the CMS built-in `ImageMedia` asset
// type. This is NOT authored content — ImageMedia is a CMS-native media type —
// so it has no properties to model and must NOT be pushed via the CLI (it's
// intentionally absent from optimizely.config.mjs).
//
// Why it's needed: the SDK's query builder (createQuery.js) treats any type
// whose key doesn't start with `_` as a registered content type. `ImageMedia`
// isn't a base type (`_image` is), so fetching one — e.g. `getPreviewContent()`
// when an editor opens an image asset — throws GraphMissingContentTypeError
// unless `ImageMedia` is in the content-type registry. Registering it with
// baseType `_image` makes the builder emit the base-type fragments
// (_metadata + media metadata) so the fetch succeeds.
//
// Shape mirrors the SDK's own internal built-ins (BlankExperienceContentType):
// a plain { baseType, key, displayName } object, not a contentType() call.
// Typed loosely to satisfy initContentTypeRegistry without a properties schema.
export const ImageMediaContentType = {
  baseType: '_image',
  key: 'ImageMedia',
  displayName: 'Image',
} as const;
