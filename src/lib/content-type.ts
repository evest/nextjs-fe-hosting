// Thin wrapper around the SDK's `contentType()` helper that lets us pass a
// top-level `description` field. The SDK's TypeScript types don't expose this
// yet, but the CMS API accepts and displays it to editors.
//
// Use this in place of `import { contentType } from '@optimizely/cms-sdk'`
// inside content-type definitions.

import { contentType as sdkContentType, ContentTypes } from '@optimizely/cms-sdk';

type WithDescription<T extends ContentTypes.AnyContentType> = T & {
  description?: string;
};

export function contentType<T extends ContentTypes.AnyContentType>(
  options: WithDescription<T>,
): T & { __type: 'contentType' } {
  return sdkContentType(options as T);
}
