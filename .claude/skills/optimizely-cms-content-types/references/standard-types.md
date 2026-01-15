# Standard Content Types

Ready-to-use content type definitions following official SDK conventions.

## Page Types

### HomePage

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const HomePageCT = contentType({
  key: 'HomePage',
  displayName: 'Home Page',
  baseType: '_page',
  properties: {
    heading: { 
      type: 'string', 
      displayName: 'Page Heading',
      required: true,
      localized: true,
      indexingType: 'searchable',
    },
    subheading: { 
      type: 'string', 
      displayName: 'Subheading',
      localized: true,
    },
    heroImage: { 
      type: 'contentReference', 
      displayName: 'Hero Image',
      allowedTypes: ['_image'],
    },
    mainContent: { 
      type: 'richText', 
      displayName: 'Main Content',
      localized: true,
    },
    featuredSections: {
      type: 'array',
      displayName: 'Featured Sections',
      items: { type: 'content' },
      maxItems: 3,
    },
  },
});
```

### ArticlePage

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const ArticlePageCT = contentType({
  key: 'ArticlePage',
  displayName: 'Article Page',
  baseType: '_page',
  properties: {
    heading: { 
      type: 'string', 
      displayName: 'Article Title',
      required: true,
      localized: true,
      maxLength: 200,
      indexingType: 'searchable',
    },
    author: { 
      type: 'string', 
      displayName: 'Author',
    },
    publishDate: { 
      type: 'dateTime', 
      displayName: 'Publish Date',
      required: true,
      indexingType: 'queryable',
    },
    featuredImage: { 
      type: 'contentReference', 
      displayName: 'Featured Image',
      allowedTypes: ['_image'],
    },
    summary: { 
      type: 'string', 
      displayName: 'Article Summary',
      localized: true,
      maxLength: 500,
    },
    body: { 
      type: 'richText', 
      displayName: 'Article Content',
      required: true,
      localized: true,
    },
    tags: {
      type: 'array',
      displayName: 'Tags',
      items: { type: 'string', maxLength: 50 },
      maxItems: 10,
    },
    relatedArticles: {
      type: 'array',
      displayName: 'Related Articles',
      items: { 
        type: 'contentReference',
        allowedTypes: ['ArticlePage'],
      },
      maxItems: 5,
    },
  },
});
```

### BlogPage

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const BlogPageCT = contentType({
  key: 'BlogPage',
  displayName: 'Blog Page',
  baseType: '_page',
  properties: {
    title: { 
      type: 'string', 
      displayName: 'Blog Title',
      required: true,
      localized: true,
    },
    author: { 
      type: 'string', 
      displayName: 'Author',
      required: true,
    },
    publishDate: { 
      type: 'dateTime', 
      displayName: 'Publish Date',
      required: true,
    },
    category: { 
      type: 'string', 
      displayName: 'Category',
      enum: [
        { value: 'tech', displayName: 'Technology' },
        { value: 'business', displayName: 'Business' },
        { value: 'lifestyle', displayName: 'Lifestyle' },
        { value: 'news', displayName: 'News' },
      ],
    },
    featuredImage: { 
      type: 'contentReference', 
      displayName: 'Featured Image',
      allowedTypes: ['_image'],
    },
    excerpt: { 
      type: 'string', 
      displayName: 'Excerpt',
      localized: true,
      maxLength: 300,
    },
    content: { 
      type: 'richText', 
      displayName: 'Blog Content',
      required: true,
      localized: true,
    },
    allowComments: { 
      type: 'boolean', 
      displayName: 'Allow Comments',
    },
    tags: {
      type: 'array',
      displayName: 'Tags',
      items: { type: 'string' },
    },
  },
});
```

### LandingPage

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const LandingPageCT = contentType({
  key: 'LandingPage',
  displayName: 'Landing Page',
  baseType: '_page',
  properties: {
    heading: { 
      type: 'string', 
      displayName: 'Page Heading',
      required: true,
      localized: true,
    },
    subheading: { 
      type: 'string', 
      displayName: 'Subheading',
      localized: true,
    },
    heroSection: { 
      type: 'content', 
      displayName: 'Hero Section',
      allowedTypes: ['HeroBlock'],
    },
    contentSections: {
      type: 'array',
      displayName: 'Content Sections',
      items: { type: 'content' },
    },
    ctaText: { 
      type: 'string', 
      displayName: 'CTA Button Text',
    },
    ctaLink: { 
      type: 'link',  // Use link type for rich link with text/title/target
      displayName: 'CTA Button Link',
    },
    hideNavigation: { 
      type: 'boolean', 
      displayName: 'Hide Navigation',
    },
  },
});
```

## Component Types (Blocks)

### HeroBlock

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const HeroBlockCT = contentType({
  key: 'HeroBlock',
  displayName: 'Hero Block',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],  // Can be used as section
  properties: {
    title: { 
      type: 'string', 
      displayName: 'Title',
      required: true,
      localized: true,
    },
    subtitle: { 
      type: 'string', 
      displayName: 'Subtitle',
      localized: true,
    },
    backgroundImage: { 
      type: 'contentReference', 
      displayName: 'Background Image',
      allowedTypes: ['_image'],
    },
    imageAlignment: { 
      type: 'string', 
      displayName: 'Image Alignment',
      enum: [
        { value: 'left', displayName: 'Left' },
        { value: 'center', displayName: 'Center' },
        { value: 'right', displayName: 'Right' },
      ],
    },
    ctas: {
      type: 'array',
      displayName: 'Call to Actions',
      items: { type: 'content' },
      maxItems: 3,
    },
    height: { 
      type: 'string', 
      displayName: 'Hero Height',
      enum: [
        { value: 'sm', displayName: 'Small' },
        { value: 'md', displayName: 'Medium' },
        { value: 'lg', displayName: 'Large' },
        { value: 'full', displayName: 'Full Screen' },
      ],
    },
  },
});
```

### CallToActionBlock

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const CallToActionBlockCT = contentType({
  key: 'CallToActionBlock',
  displayName: 'Call To Action Block',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],  // Works as both!
  properties: {
    heading: { 
      type: 'string', 
      displayName: 'Heading',
      required: true,
      localized: true,
    },
    description: { 
      type: 'richText', 
      displayName: 'Description',
      localized: true,
    },
    primaryButtonText: { 
      type: 'string', 
      displayName: 'Primary Button Text',
      required: true,
    },
    primaryButtonLink: { 
      type: 'link',  // Rich link with text/title/target
      displayName: 'Primary Button Link',
      required: true,
    },
    secondaryButtonText: { 
      type: 'string', 
      displayName: 'Secondary Button Text',
    },
    secondaryButtonLink: { 
      type: 'link',
      displayName: 'Secondary Button Link',
    },
    style: { 
      type: 'string', 
      displayName: 'CTA Style',
      enum: [
        { value: 'default', displayName: 'Default' },
        { value: 'bordered', displayName: 'Bordered' },
        { value: 'filled', displayName: 'Filled' },
        { value: 'gradient', displayName: 'Gradient' },
      ],
    },
  },
});
```

### CardBlock

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const CardBlockCT = contentType({
  key: 'CardBlock',
  displayName: 'Card Block',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],  // Flexible usage
  properties: {
    heading: { 
      type: 'string', 
      displayName: 'Card Heading',
      required: true,
      localized: true,
    },
    image: { 
      type: 'contentReference', 
      displayName: 'Card Image',
      allowedTypes: ['_image'],
    },
    description: { 
      type: 'richText', 
      displayName: 'Card Description',
      localized: true,
    },
    linkText: { 
      type: 'string', 
      displayName: 'Link Text',
    },
    linkUrl: { 
      type: 'url',  // Simple URL
      displayName: 'Link URL',
    },
  },
});
```

## Element Types

> **Important:** Elements use `_component` as the base type with `compositionBehaviors: ['elementEnabled']`. There is no `_element` base type in Optimizely CMS.

### TitleElement

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const TitleElementCT = contentType({
  key: 'TitleElement',
  displayName: 'Title Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    text: { 
      type: 'string', 
      displayName: 'Title Text',
      required: true,
      localized: true,
    },
    level: { 
      type: 'string', 
      displayName: 'Heading Level',
      enum: [
        { value: 'h1', displayName: 'H1' },
        { value: 'h2', displayName: 'H2' },
        { value: 'h3', displayName: 'H3' },
        { value: 'h4', displayName: 'H4' },
        { value: 'h5', displayName: 'H5' },
        { value: 'h6', displayName: 'H6' },
      ],
    },
    alignment: { 
      type: 'string', 
      displayName: 'Text Alignment',
      enum: [
        { value: 'left', displayName: 'Left' },
        { value: 'center', displayName: 'Center' },
        { value: 'right', displayName: 'Right' },
      ],
    },
  },
});
```

### ImageElement

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const ImageElementCT = contentType({
  key: 'ImageElement',
  displayName: 'Image Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    image: { 
      type: 'contentReference', 
      displayName: 'Image',
      required: true,
      allowedTypes: ['_image'],
    },
    altText: { 
      type: 'string', 
      displayName: 'Alt Text',
      required: true,
      localized: true,
    },
    caption: { 
      type: 'string', 
      displayName: 'Caption',
      localized: true,
    },
    link: { 
      type: 'url',  // Simple URL
      displayName: 'Image Link',
    },
  },
});
```

### ButtonElement

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const ButtonElementCT = contentType({
  key: 'ButtonElement',
  displayName: 'Button Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    text: { 
      type: 'string', 
      displayName: 'Button Text',
      required: true,
      localized: true,
    },
    link: { 
      type: 'link',  // Rich link with text/title/target
      displayName: 'Button Link',
      required: true,
    },
    style: { 
      type: 'string', 
      displayName: 'Button Style',
      enum: [
        { value: 'primary', displayName: 'Primary' },
        { value: 'secondary', displayName: 'Secondary' },
        { value: 'outline', displayName: 'Outline' },
        { value: 'text', displayName: 'Text Only' },
      ],
    },
    size: { 
      type: 'string', 
      displayName: 'Button Size',
      enum: [
        { value: 'sm', displayName: 'Small' },
        { value: 'md', displayName: 'Medium' },
        { value: 'lg', displayName: 'Large' },
      ],
    },
  },
});
```

## Section Type

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const HeroSectionCT = contentType({
  key: 'HeroSection',
  displayName: 'Hero Section',
  baseType: '_section',
  properties: {
    backgroundImage: {
      type: 'contentReference',
      displayName: 'Background Image',
      allowedTypes: ['_image'],
    },
    backgroundColor: {
      type: 'string',
      displayName: 'Background Color',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
  },
});
```

## Experience Type

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const AboutExperienceCT = contentType({
  key: 'AboutExperience',
  displayName: 'About Experience',
  baseType: '_experience',
  properties: {
    title: {
      type: 'string',
      displayName: 'Title',
      required: true,
    },
    subtitle: {
      type: 'string',
      displayName: 'Subtitle',
    },
  },
});
```

## Usage Tips

1. **Copy entire definitions** - Ready to use
2. **Customize properties** - Add/remove as needed
3. **Update keys** - Ensure uniqueness
4. **Note URL vs Link** - Use `url` for simple URLs, `link` for rich links
5. **IndexingType** - Default is 'searchable'
6. **CompositionBehaviors** - Add for Visual Builder flexibility
7. **Property groups** - Add `group` field
8. **Export naming** - Use "CT" suffix

## Component Pattern

```typescript
import { Infer } from '@optimizely/cms-sdk';
import { HeroBlockCT } from './HeroBlock';

type Props = {
  opti: Infer<typeof HeroBlockCT>;
};

export default function HeroBlock({ opti }: Props) {
  return (
    <div className="hero">
      <h1>{opti.title}</h1>
      <p>{opti.subtitle}</p>
    </div>
  );
}
```

## Rendering Images from Content References

**CRITICAL**: Image URLs from Optimizely content references use a nested structure and must be accessed via `.url.default`.

### Correct Image Rendering Pattern

```typescript
import { Infer } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  opti: Infer<typeof HeroBlockCT>;
};

export default function HeroBlock({ opti }: Props) {
  const { pa } = getPreviewUtils(opti);

  return (
    <div className="hero">
      {/* ✅ CORRECT: Access nested url.default property */}
      {opti.backgroundImage?.url?.default && (
        <img
          src={opti.backgroundImage.url.default}
          alt={opti.title || "Hero background"}
          className="hero-bg"
          {...pa("backgroundImage")}
        />
      )}

      {/* ✅ Also works with Next.js Image component */}
      {opti.backgroundImage?.url?.default && (
        <Image
          src={opti.backgroundImage.url.default}
          alt={opti.title || "Hero background"}
          fill
          className="hero-bg"
        />
      )}
    </div>
  );
}
```

### Common Mistakes to Avoid

```typescript
// ❌ WRONG: Using the reference object directly
<img src={opti.backgroundImage} alt="..." />
// Result: [object Object] or invalid URL error

// ❌ WRONG: Missing .url.default
<img src={opti.backgroundImage.url} alt="..." />
// Result: Still an object, not a string

// ✅ CORRECT: Full path to URL string
<img src={opti.backgroundImage?.url?.default} alt="..." />
```

### URL Structure Explanation

When you define a content reference to an image:

```typescript
backgroundImage: {
  type: 'contentReference',
  allowedTypes: ['_image'],
}
```

The runtime value structure is:

```typescript
{
  backgroundImage: {
    url: {
      default: "https://cdn.optimizely.com/...",
      // Other variants may exist
    },
    // Other metadata properties
  }
}
```

### Multiple Image References Example

```typescript
export default function TestimonialBlock({ opti }: Props) {
  const { pa } = getPreviewUtils(opti);

  return (
    <div>
      {/* Customer photo */}
      {opti.customerPhoto?.url?.default && (
        <img
          src={opti.customerPhoto.url.default}
          alt={opti.customerName || "Customer"}
          width={60}
          height={60}
          className="rounded-full"
          {...pa("customerPhoto")}
        />
      )}

      {/* Company logo */}
      {opti.companyLogo?.url?.default && (
        <img
          src={opti.companyLogo.url.default}
          alt="Company logo"
          className="logo"
          {...pa("companyLogo")}
        />
      )}
    </div>
  );
}
```

### Best Practices

1. **Always use optional chaining** (`?.`) when accessing image URLs to handle undefined references
2. **Check for url.default existence** before rendering image elements
3. **Use preview attributes** (`{...pa("propertyName")}`) for edit mode functionality
4. **Provide meaningful alt text** using content from your opti object when available
5. **Standard img vs Next.js Image**: Both work, but remember Next.js Image requires configuration in `next.config.ts` for external domains
