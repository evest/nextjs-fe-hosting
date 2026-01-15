---
name: optimizely-cms-content-types
description: "Generate TypeScript content type definitions for Optimizely SaaS CMS using the Content JS SDK (@optimizely/cms-sdk). Use when the user requests: (1) Creating Optimizely content types, (2) Generating TypeScript files for pages/blocks/elements/experiences, (3) Setting up CMS content models, (4) Creating components like HeroBlock, BannerBlock, CardBlock, (5) Defining page types like HomePage, ArticlePage, BlogPage, (6) Creating elements or sections for Visual Builder, or (7) Making blocks that work as both blocks and elements using compositionBehaviors. Based on official SDK documentation and source code."
---

# Optimizely CMS Content Types

Generate TypeScript content type definitions for Optimizely SaaS CMS using the Content JS SDK.

## Overview

Create properly structured content type definitions for Optimizely SaaS CMS using the `contentType` function from `@optimizely/cms-sdk`.

**Key capabilities:**
- **Pages** (`_page`): HomePage, ArticlePage, BlogPage with unique URLs
- **Components** (`_component`): HeroBlock, BannerBlock, CardBlock - reusable blocks
- **Sections** (`_section`): Visual Builder sections with layout system
- **Elements** (`_component` + `elementEnabled`): Smaller Visual Builder elements (use `_component` base type with `compositionBehaviors: ['elementEnabled']`)
- **Experiences** (`_experience`): Flexible visual page building
- **Composition**: Make components work as sections/elements with `compositionBehaviors`
- **Media types**: Custom image, video, media types
- **Folders** (`_folder`): Organize content in asset panel

## Quick Start

### Basic Article Page

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const ArticleContentType = contentType({
  key: 'Article',
  baseType: '_page',
  properties: {
    heading: {
      type: 'string',
      displayName: 'Article Heading',
      group: 'content',
      indexingType: 'searchable',
    },
    body: {
      type: 'richText',
      displayName: 'Article Body',
      group: 'content',
    },
  },
});
```

### Component with Composition Behaviors

```typescript
export const HeroBlockCT = contentType({
  key: 'HeroBlock',
  displayName: 'Hero Block',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],  // Can be used as section
  properties: {
    title: { type: 'string', displayName: 'Title' },
    subtitle: { type: 'string', displayName: 'Subtitle' },
  },
});
```

## Built-in Content Metadata

**IMPORTANT**: All content types automatically include built-in metadata properties via `opti._metadata`. **DO NOT create redundant properties** for these fields.

### Available Metadata Properties

Every content item has `_metadata` with the following properties:

```typescript
opti._metadata.key           // Content unique key (string)
opti._metadata.locale        // Current locale (string)
opti._metadata.version       // Version number (string)
opti._metadata.displayName   // Display name (string)
opti._metadata.url           // InferredUrl object
opti._metadata.types         // Array of type names (string[])
opti._metadata.published     // Published date (string) ✅ Use instead of creating publishDate
opti._metadata.status        // Content status (string)
opti._metadata.created       // Created date (string)
opti._metadata.lastModified  // Last modified date (string)
opti._metadata.sortOrder     // Sort order (number)
opti._metadata.variation     // Variation name (string)
```

**Instance-specific metadata** (available on pages/instances):
```typescript
opti._metadata.locales       // Available locales (string[])
opti._metadata.expired       // Expiration date (string | null)
opti._metadata.container     // Container path (string | null)
opti._metadata.owner         // Owner identifier (string | null)
opti._metadata.routeSegment  // URL route segment (string | null)
opti._metadata.lastModifiedBy // Last modifier (string | null)
opti._metadata.path          // Content path (string[])
opti._metadata.createdBy     // Creator identifier (string | null)
```

### Common Mistakes to Avoid

❌ **DON'T create these redundant properties:**
```typescript
properties: {
  publishDate: { type: 'dateTime' },  // ❌ Use opti._metadata.published instead
  createdDate: { type: 'dateTime' },  // ❌ Use opti._metadata.created instead
  lastModified: { type: 'dateTime' }, // ❌ Use opti._metadata.lastModified instead
  title: { type: 'string' },          // ❌ Use opti._metadata.displayName instead (for system title)
}
```

✅ **DO use built-in metadata:**
```typescript
// In your component
export default function NewsPage({ opti }: Props) {
  const publishedDate = opti._metadata.published;
  const createdDate = opti._metadata.created;
  const pageTitle = opti._metadata.displayName;

  return (
    <article>
      <time dateTime={publishedDate}>{new Date(publishedDate).toLocaleDateString()}</time>
    </article>
  );
}
```

**When to create custom date properties:**
- Event start/end dates
- Custom scheduling fields
- Business-specific dates that differ from content lifecycle dates

### Other Built-in Properties

```typescript
opti._id              // Unique content ID (string)
opti.__typename       // Content type name (string)
opti.__context?.edit  // Preview/edit mode flag (boolean)
```

## Property Types

### String
Simple text fields for titles, names, short text.

```typescript
title: {
  type: 'string',
  displayName: 'Title',
  minLength: 5,
  maxLength: 100,
  pattern: '^[A-Za-z0-9 ]+$',
  enum: [
    { value: 'sm', displayName: 'Small' },
    { value: 'lg', displayName: 'Large' },
  ],
}
```

### Rich Text
Formatted content with rich text editing (Slate.js format).

```typescript
body: {
  type: 'richText',
  displayName: 'Article Body',
  localized: true,
}
```

### URL vs Link

**IMPORTANT DISTINCTION:**

**URL Property** - For simple web addresses as strings:
```typescript
websiteUrl: {
  type: 'url',
  displayName: 'Website URL',
  description: 'External website link',
}
```

**Link Property** - For rich link objects with all `<a>` tag attributes (text, title, target):
```typescript
ctaLink: {
  type: 'link',
  displayName: 'Call to Action Link',
  description: 'Link with title and target options',
}
```

**Key difference:** Use `url` for simple URL storage, use `link` when you need text, title, and target attributes.

### Boolean
True/false checkbox.

```typescript
isPublished: {
  type: 'boolean',
  displayName: 'Published',
}
```

### Integer & Float
Whole numbers or decimal values.

```typescript
quantity: {
  type: 'integer',
  displayName: 'Quantity',
  minimum: 1,
  maximum: 100,
}

price: {
  type: 'float',
  displayName: 'Price',
  minimum: 0.01,
  maximum: 99999.99,
}
```

### DateTime
Date and time values with optional constraints.

```typescript
publishDate: {
  type: 'dateTime',
  displayName: 'Publish Date',
  required: true,
}

eventStartTime: {
  type: 'dateTime',
  displayName: 'Event Start',
  minimum: '2025-12-01T00:00:00Z',  // ISO format
  maximum: '2025-12-31T23:59:59Z',
}
```

### Array
Lists of values. **Cannot contain nested arrays.**

```typescript
tags: {
  type: 'array',
  displayName: 'Tags',
  items: { type: 'string' },
  minItems: 1,
  maxItems: 10,
}

relatedArticles: {
  type: 'array',
  displayName: 'Related Articles',
  items: {
    type: 'content',
    allowedTypes: ['ArticlePage'],
  },
}
```

### Content & ContentReference
Reference to other content items.

```typescript
featuredImage: {
  type: 'contentReference',
  displayName: 'Featured Image',
  allowedTypes: ['_image'],
}

heroSection: {
  type: 'content',
  displayName: 'Hero Section',
  allowedTypes: ['HeroBlock'],
  restrictedTypes: ['_folder'],
}
```

### Component
Embed a specific component type (strongly typed).

```typescript
import { HeroBlockCT } from './HeroBlock';

hero: {
  type: 'component',
  contentType: HeroBlockCT,
  displayName: 'Hero Section',
}
```

### Binary & JSON
```typescript
attachment: { type: 'binary', displayName: 'File' }
metadata: { type: 'json', displayName: 'Metadata' }
```

## Property Configuration Options

### Common Options

```typescript
{
  displayName: 'Field Label',      // Shown in CMS UI
  description: 'Help text',        // Tooltip
  required: true,                  // Must have value
  localized: true,                 // Different per language
  group: 'content',                // Property group
  sortOrder: 10,                   // Display order
  indexingType: 'searchable',      // Search configuration
}
```

### Indexing Types

Controls how properties are indexed for search. **Default is 'searchable'.**

- **`'searchable'`** (default) - Fully indexed for full-text search
- **`'queryable'`** - Can be filtered/sorted but not full-text searched
- **`'disabled'`** - Not indexed at all

```typescript
properties: {
  title: {
    type: 'string',
    indexingType: 'searchable',   // Full-text search
  },
  publishDate: {
    type: 'dateTime',
    indexingType: 'queryable',    // Filter/sort only
  },
  internalNotes: {
    type: 'string',
    indexingType: 'disabled',     // Not searchable
  },
}
```

## Content Relationships

### AllowedTypes & RestrictedTypes

Control which content types can be referenced:

```typescript
featuredArticle: {
  type: 'content',
  allowedTypes: [ArticleCT],  // Only allow Article
}

relatedContent: {
  type: 'content',
  restrictedTypes: ['_folder'],  // Allow all except folders
}
```

**AllowedTypes** - Whitelist that can include:
- Specific content types: `[ArticleCT, VideoCT]`
- Base types: `['_page', '_component']`
- Self-reference: `['_self']`

**RestrictedTypes** - Blacklist using same format

## MayContainTypes

Defines which content types can be created as children. Applies to `_page`, `_experience`, and `_folder` base types.

```typescript
export const BlogPageCT = contentType({
  key: 'BlogPage',
  baseType: '_page',
  mayContainTypes: [
    ArticleCT,
    '_page',     // All page types
    '_self',     // Same type (BlogPage)
    '*',         // Wildcard: allow all types
  ],
  properties: { /* ... */ },
});
```

**Options:**
- Specific types: `[ArticleCT]`
- Base types: `['_page', '_component']`
- Self-reference: `['_self']`
- **Wildcard: `['*']`** - Allow all types

## CompositionBehaviors

Make components usable in Visual Builder:

```typescript
export const CardBlockCT = contentType({
  key: 'CardBlock',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],  // Flexible!
  properties: { /* ... */ },
});
```

**Options:**
- `'sectionEnabled'` - Can be used as a section
- `'elementEnabled'` - Can be used as an element
- Both - Maximum flexibility

**⚠️ IMPORTANT RESTRICTIONS for `elementEnabled`**:

Content types with `elementEnabled` in `compositionBehaviors` have the following restrictions. **Elements are meant to be simple, atomic components, not containers.**

**FORBIDDEN property types with `elementEnabled`:**
1. ❌ Arrays with content: `type: "array"` with `items: { type: "content" }`
2. ❌ Content properties: `type: "content"`
3. ❌ Component properties: `type: "component"`
4. ❌ JSON properties: `type: "json"`

**ALLOWED property types with `elementEnabled`:**
- ✅ Simple types: `string`, `boolean`, `integer`, `float`, `dateTime`, `url`, `richText`
- ✅ Content references: `type: "contentReference"` (for images, media)
- ✅ Arrays of simple types: `type: "array"` with `items: { type: "string" }` etc.

**When to use ONLY `sectionEnabled`** (remove `elementEnabled`):
- Component needs to contain other content blocks
- Component needs arrays of content items (like AccordionBlock with AccordionItems)
- Component needs JSON data structures
- Component acts as a container or has complex nested content

## Base Types

| Base Type | Description | Use For |
|-----------|-------------|---------|
| `_page` | Pages with unique URLs | HomePage, ArticlePage, BlogPage |
| `_component` | Reusable blocks/components | HeroBlock, CardBlock, and **elements** (with `elementEnabled`) |
| `_section` | Visual Builder sections with layout | Custom sections |
| `_experience` | Flexible visual page building | Dynamic experiences |
| `_folder` | Organizing content | Asset panel organization |
| `_image` | Image media types | Custom image types |
| `_video` | Video media types | Custom video types |
| `_media` | Generic media types | Documents, files |

> **Note:** There is no `_element` base type. Elements are `_component` types with `compositionBehaviors: ['elementEnabled']`.

## Built-in Content Types

The SDK provides ready-to-use types:

```typescript
import { BlankExperienceContentType, BlankSectionContentType } from '@optimizely/cms-sdk';
```

- **BlankExperienceContentType** - Experience with no predefined properties
- **BlankSectionContentType** - Section with no predefined properties

**Important!** Do not create a new type called `BlankExperience` as this is already defined in the CMS by default.

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Content type key | PascalCase | `HeroBlock`, `ArticlePage` |
| Export name | PascalCase + "CT" suffix | `HeroBlockCT`, `ArticlePageCT` |
| Display name | Friendly with spaces | `Hero Block`, `Article Page` |
| Property keys | camelCase | `heading`, `ctaUrl`, `backgroundImage` |
| Property display names | Friendly | `Heading`, `CTA URL`, `Background Image` |
| File names | Match content type key | `HeroBlock.tsx`, `ArticlePage.tsx` |

## Property Groups

Organize properties in the CMS editor.

### Define in Config

In `optimizely.config.mjs`:

```javascript
import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: ['./src/components/**/*.tsx'],
  propertyGroups: [
    { key: 'content', displayName: 'Content', sortOrder: 1 },
    { key: 'seo', displayName: 'SEO', sortOrder: 2 },
    { key: 'styling', displayName: 'Styling', sortOrder: 3 },
  ],
});
```

### Use in Properties

```typescript
properties: {
  title: {
    type: 'string',
    displayName: 'Page Title',
    group: 'seo',  // Assigns to SEO group
  },
}
```

**Built-in groups** (always available):
- `Information`, `Scheduling`, `Advanced`, `Shortcut`, `Categories`, `DynamicBlocks`

## Common Patterns

See `references/standard-types.md` for complete examples:
- Page types: HomePage, ArticlePage, BlogPage, LandingPage
- Components: HeroBlock, BannerBlock, CallToActionBlock, CardBlock
- Elements: TitleElement, TextElement, ImageElement, ButtonElement

See `references/composition-patterns.md` for:
- Nested components
- Tab and accordion patterns
- Card grids
- Flexible content areas

## Best Practices

1. **Check built-in metadata first** - Use `opti._metadata.published`, `opti._metadata.created`, etc. instead of creating redundant properties
2. **Use camelCase for property keys** - Follow SDK conventions
3. **Add displayName always** - Makes CMS user-friendly
4. **Export with "CT" suffix** - e.g., `HeroBlockCT`, `ArticlePageCT`
5. **Use indexingType appropriately** - Default is 'searchable'
6. **Distinguish url vs link** - Use `url` for simple URLs, `link` for rich links
7. **Enable localization** - Set `localized: true` for translatable content
8. **Use compositionBehaviors** - Make components flexible, but avoid `elementEnabled` with JSON/content properties
9. **Control with allowedTypes** - Prevent wrong content types
10. **Use wildcard cautiously** - `mayContainTypes: ['*']` allows all types
11. **No nested arrays** - Arrays cannot contain array items

## Sync to CMS

After defining content types, sync them:

```bash
npx @optimizely/cms-cli@latest config push optimizely.config.mjs
```

## References

- `references/property-types.md` - Complete property type reference
- `references/standard-types.md` - Ready-to-use pages, blocks, elements
- `references/validation.md` - Validation patterns and regex
- `references/composition-patterns.md` - Advanced composition patterns
- `references/troubleshooting.md` - Common errors and solutions
