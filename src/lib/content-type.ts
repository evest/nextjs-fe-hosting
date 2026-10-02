// Thin wrapper around the SDK's `contentType()` helper that lets us pass a
// top-level `description` field. The SDK's TypeScript types don't expose this
// yet, but the CMS API accepts and displays it to editors.
//
// Use this in place of `import { contentType } from '@optimizely/cms-sdk'`
// inside content-type definitions.

import {
  contentType as sdkContentType,
  AnyContentType,
  ContentType,
} from '@optimizely/cms-sdk';

type WithDescription<T extends AnyContentType> = T & {
  description?: string;
};

export function contentType<T extends AnyContentType>(
  options: WithDescription<T>,
): ContentType<T> {
  return sdkContentType(options as T);
}
