// The CMS's standard types: Visual Builder's blank experience/section and the
// three media types. A new SaaS CMS instance is created with them, but they
// are ordinary content types, so an editor can delete them (the Test1 CMS was
// missing all five). Without ImageMedia nobody can upload images, and
// BlankSectionDisplayTemplate fails to push without BlankSection.
//
// Defining them here makes `cms:push-config` recreate them when missing. The
// values mirror what the CMS creates (copied from the Test2 instance), so on an
// instance that has them the push changes nothing.
//
// Push-only: these are listed in optimizely.config.mjs but deliberately NOT
// exported from ./index.ts. The SDK registry keeps using its own built-ins
// (BlankExperienceContentType, ./ImageMedia) so rendering is unaffected.
//
// Plain objects with `__type: 'contentType'` (what contentType() returns)
// because the SDK's types don't allow sortOrder, mediaFileExtensions or
// compositionBehaviors on these base types, while the CMS sets them.

const builtIn = <T extends object>(definition: T) =>
  ({ ...definition, properties: {}, __type: 'contentType' }) as T & {
    properties: Record<string, never>;
    __type: 'contentType';
  };

export const BlankExperienceCT = builtIn({
  key: 'BlankExperience',
  displayName: 'Blank Experience',
  description: 'An experience without a predefined layout.',
  baseType: '_experience',
  sortOrder: 0,
  mayContainTypes: ['*'],
});

export const BlankSectionCT = builtIn({
  key: 'BlankSection',
  displayName: 'Blank Section',
  description: 'A section without a predefined layout.',
  baseType: '_section',
  sortOrder: 0,
  compositionBehaviors: ['sectionEnabled'],
});

export const GenericMediaCT = builtIn({
  key: 'GenericMedia',
  displayName: 'Generic media',
  description: 'Used for generic media without any dedicated content type.',
  baseType: '_media',
  sortOrder: 500,
});

export const ImageMediaCT = builtIn({
  key: 'ImageMedia',
  displayName: 'Image media',
  description: 'Used for image assets.',
  baseType: '_image',
  sortOrder: 510,
  mediaFileExtensions: ['jpg', 'jpeg', 'jpe', 'ico', 'gif', 'bmp', 'heif', 'png', 'svg', 'tiff', 'webp'],
});

export const VideoMediaCT = builtIn({
  key: 'VideoMedia',
  displayName: 'Video media',
  description: 'Used for video assets.',
  baseType: '_video',
  sortOrder: 520,
  mediaFileExtensions: [
    'avi', 'av1', 'flv', 'm4v', 'mkv', 'mov', 'mp4', 'mp4v', 'mpg',
    'ogg', 'ogv', 'qt', 'vc1', 'vob', 'webm', 'wmv',
  ],
});
