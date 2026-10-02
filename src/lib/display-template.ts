// Thin wrapper around the SDK's `displayTemplate()` helper that preserves
// literal types in the settings object.
//
// Since cms-sdk 2.2 the `editor` field is typed as `'select' | 'checkbox' |
// string`, which collapses to `string`. The SDK's generic then widens
// `editor: 'select'` to `string`, and `ContentProps<typeof Template>` infers
// every select setting as `never`. A `const` type parameter keeps the literals.
//
// Use this in place of `import { displayTemplate } from '@optimizely/cms-sdk'`
// inside display-template definitions.

import {
  displayTemplate as sdkDisplayTemplate,
  DisplayTemplate,
  DisplayTemplateVariant,
} from '@optimizely/cms-sdk';

export function displayTemplate<const T extends DisplayTemplateVariant>(
  options: T,
): DisplayTemplate<T> {
  return sdkDisplayTemplate(options);
}
