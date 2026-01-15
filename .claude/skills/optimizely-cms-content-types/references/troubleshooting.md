# Troubleshooting Guide

Common issues and solutions when working with Optimizely CMS content types and React components.

## CMS Sync Errors

### "The base type '_element' is not supported"

**Error**: When pushing config to CMS, you get an error: `The base type '_element' is not supported.`

**Cause**: There is no `_element` base type in Optimizely CMS. Elements are actually `_component` types with the `elementEnabled` composition behavior.

**❌ Wrong:**
```typescript
export const TextElementCT = contentType({
  key: 'TextElement',
  displayName: 'Text Element',
  baseType: '_element',  // ❌ This base type does not exist!
  properties: {
    text: { type: 'string', displayName: 'Text' },
  },
});
```

**✅ Correct:**
```typescript
export const TextElementCT = contentType({
  key: 'TextElement',
  displayName: 'Text Element',
  baseType: '_component',  // ✅ Use _component
  compositionBehaviors: ['elementEnabled'],  // ✅ Add elementEnabled behavior
  properties: {
    text: { type: 'string', displayName: 'Text' },
  },
});
```

**Key points:**
- Elements use `baseType: '_component'`
- Add `compositionBehaviors: ['elementEnabled']` to make it an element
- You can also add `'sectionEnabled'` if you want the component to work as both

---

### "The property 'X' is not allowed when content type has ElementEnabled"

**Error**: When pushing config to CMS, you get an error about array properties not being allowed with `elementEnabled`.

**Cause**: Optimizely CMS restricts content types with `compositionBehaviors: ["elementEnabled"]` from having certain complex property types. Elements are meant to be simple, atomic components, not containers.

**FORBIDDEN property types with `elementEnabled`:**
1. ❌ Arrays with content: `type: "array"` with `items: { type: "content" }`
2. ❌ Content properties: `type: "content"`
3. ❌ Component properties: `type: "component"`
4. ❌ JSON properties: `type: "json"`

**ALLOWED property types with `elementEnabled`:**
- ✅ Simple types: `string`, `boolean`, `integer`, `float`, `dateTime`, `url`, `richText`
- ✅ Content references: `type: "contentReference"` (for images, media)
- ✅ Arrays of simple types: `type: "array"` with `items: { type: "string" }` etc.

**Solution options:**

1. **Remove elementEnabled** - If the component needs to contain other content, keep only `sectionEnabled`:
   ```typescript
   compositionBehaviors: ["sectionEnabled"],  // Remove "elementEnabled"
   ```

2. **Remove the array property** - If you want to keep it as an element, remove array properties with content items

3. **Use JSON instead** - For simple data arrays (not content references), use `type: "json"`:
   ```typescript
   // ❌ Not allowed with elementEnabled
   items: {
     type: "array",
     items: { type: "content", allowedTypes: [ItemType] }
   }

   // ✅ Allowed - simple data
   items: {
     type: "json",
     displayName: "Items",
     description: "Array of item data"
   }
   ```

**Example:**

```typescript
// ❌ This will fail when syncing to CMS
export const AccordionBlockType = contentType({
  key: "AccordionBlock",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled", "sectionEnabled"],  // Has elementEnabled
  properties: {
    items: {  // Array of content - NOT ALLOWED!
      type: "array",
      items: {
        type: "content",
        allowedTypes: [AccordionItemType],
      },
    },
  },
});

// ✅ Fixed - removed elementEnabled
export const AccordionBlockType = contentType({
  key: "AccordionBlock",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],  // Only sectionEnabled
  properties: {
    items: {  // Now allowed
      type: "array",
      items: {
        type: "content",
        allowedTypes: [AccordionItemType],
      },
    },
  },
});
```

**Quick check**: Search your codebase for files with both `elementEnabled` and array properties:
```bash
grep -l "compositionBehaviors.*elementEnabled" src/components/*.tsx | xargs grep -l "items:"
```

## TypeScript Build Errors

### Module Import Errors

**❌ Error:** `Can't resolve '@optimizely/cms-sdk/react'`

**Cause:** Incorrect import path for React server utilities.

**✅ Correct import paths:**
```typescript
// ❌ Wrong
import { getPreviewUtils } from "@optimizely/cms-sdk/react";

// ✅ Correct
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { RichText } from "@optimizely/cms-sdk/react/richText";
```

### Property Type Name Casing

**❌ Error:** `Type '"richtext"' is not assignable to type...`

**Cause:** Property type names must use exact camelCase.

**Common mistakes:**
```typescript
// ❌ Wrong
type: "richtext"  // lowercase
type: "RichText"  // PascalCase
type: "datetime"  // lowercase

// ✅ Correct
type: "richText"  // camelCase
type: "dateTime"  // camelCase
type: "contentReference"  // camelCase
```

### "Property X does not exist on type..."

This is the most common error when a property is used in your React component but not defined in the content type schema.

**Solution workflow:**
1. Check if the property is used in the component code
2. Add it to the `contentType()` definition with the correct type
3. For special types (URL, boolean, numeric), add proper type guards in the component
4. For JSON arrays, add TypeScript type definitions and cast appropriately
5. Register any new content types in `layout.tsx`

**Example:**
```typescript
// ❌ Error: Property 'cta' does not exist
export const CardBlockType = contentType({
  key: "CardBlock",
  baseType: "_component",
  properties: {
    heading: { type: "string", displayName: "Heading" },
    // Missing 'cta' property!
  },
});

// ✅ Fixed
import { CtaBlockType } from "./CtaBlock";

export const CardBlockType = contentType({
  key: "CardBlock",
  baseType: "_component",
  properties: {
    heading: { type: "string", displayName: "Heading" },
    cta: {
      type: "content",
      displayName: "Call to Action",
      description: "Optional CTA button",
      allowedTypes: [CtaBlockType],
    },
  },
});
```

## Display Template Errors

### "Object literal may only specify known properties, and 'type' does not exist..."

**❌ Error:** TypeScript error when defining display template settings.

**Cause:** Display template settings use a different structure than property definitions.

**❌ Wrong:**
```typescript
export const MyDisplayTemplate = displayTemplate({
  key: "MyDisplayTemplate",
  isDefault: true,
  settings: {
    alignment: {
      type: "select",  // ❌ 'type' is wrong
      label: "Alignment",
      options: [  // ❌ 'options' is wrong
        { value: "left", label: "Left" },
      ],
    },
  },
});
```

**✅ Correct:**
```typescript
export const MyDisplayTemplate = displayTemplate({
  key: "MyDisplayTemplate",
  isDefault: true,
  displayName: "My Display Template",
  baseType: "_component",
  settings: {
    alignment: {
      editor: "select",  // ✅ Use 'editor', not 'type'
      displayName: "Alignment",  // ✅ Use 'displayName', not 'label'
      sortOrder: 0,  // ✅ Required
      choices: {  // ✅ Use 'choices' object, not 'options' array
        left: {
          displayName: "Left",
          sortOrder: 0,
        },
        center: {
          displayName: "Center",
          sortOrder: 10,
        },
      },
    },
  },
});
```

**Key differences for display templates:**
- Use `editor: "select"` or `editor: "checkbox"` (not `type`)
- Use `displayName` (not `label`)
- Use `choices: { key: { displayName, sortOrder } }` (not `options: []`)
- Always include `sortOrder` for both settings and choices
- Include `displayName` and `baseType` at the template level

### RichText Component Props

**❌ Error:** `Property 'className' does not exist on type 'RichTextProps'`

**Cause:** The `RichText` component from the SDK doesn't accept a `className` prop.

**❌ Wrong:**
```typescript
<RichText content={opti.content?.json} className="prose" />
```

**✅ Correct - Wrap in a div:**
```typescript
<div className="prose prose-lg">
  <RichText content={opti.content?.json} />
</div>
```

### Styling for Light/Dark Mode

When using Tailwind's prose plugin, be careful with color modifiers:

**❌ Poor contrast in light mode:**
```typescript
<div className="prose prose-invert prose-lg">
  <RichText content={opti.content?.json} />
</div>
```

**✅ Good for light mode:**
```typescript
<div className="prose prose-lg">
  <RichText content={opti.content?.json} />
</div>
```

**✅ Adaptive (dark mode support):**
```typescript
<div className="prose prose-lg dark:prose-invert">
  <RichText content={opti.content?.json} />
</div>
```

## Property Type Issues

### Numeric Types

**❌ Wrong:**
```typescript
overlayOpacity: {
  type: "number",  // 'number' is not a valid type!
}
```

**✅ Correct:**
```typescript
overlayOpacity: {
  type: "integer",  // Use 'integer' or 'float'
  displayName: "Overlay Opacity",
  description: "Background overlay opacity (0-100)",
}
```

### Default Values Not Supported

The SDK does NOT support `default` values in property definitions.

**❌ Wrong:**
```typescript
allowMultiple: {
  type: "boolean",
  displayName: "Allow Multiple Open",
  default: false,  // This will cause a TypeScript error!
}
```

**✅ Correct:**
```typescript
// 1. Remove default from schema
allowMultiple: {
  type: "boolean",
  displayName: "Allow Multiple Open",
}

// 2. Handle default in component code
const allowMultiple = opti.allowMultiple ?? false;
// or
if (opti.allowMultiple === true) {
  // ...
}
```

### Arrays of Content

For arrays containing content items, use the nested structure:

```typescript
items: {
  type: "array",
  displayName: "Accordion Items",
  items: {
    type: "content",
    allowedTypes: [AccordionItemType],
  },
},
```

## Type Handling in Components

### InferredUrl Type

URL properties return `InferredUrl` objects, not strings. Access the string value via `.default`:

**❌ Wrong:**
```typescript
<Link href={opti.url}>...</Link>
// Error: Type 'InferredUrl' is not assignable to type 'Url'
```

**✅ Correct:**
```typescript
<Link href={opti.url?.default || "#"}>...</Link>
```

**For video/iframe src:**
```typescript
<iframe src={opti.embedUrl?.default || ""} />
```

### Boolean Types

Boolean properties can be `true | false | null`, not just `true | false | undefined`.

**❌ Wrong:**
```typescript
<video autoPlay={opti.autoplay} />
// Error: Type 'boolean | null' is not assignable to type 'boolean | undefined'
```

**✅ Correct:**
```typescript
<video autoPlay={opti.autoplay === true} />
```

### JSON Property Arrays

When using `type: "json"` for arrays, you must cast the type in your component:

**1. Define the TypeScript type:**
```typescript
type ContactInfo = {
  type: string;
  label: string;
  value: string;
};
```

**2. Add property to content type:**
```typescript
contactInfo: {
  type: "json",
  displayName: "Contact Information",
  description: "Array of contact information items",
}
```

**3. Use with type guards and casting:**
```typescript
{opti.contactInfo && Array.isArray(opti.contactInfo) && opti.contactInfo.length > 0 && (
  <div>
    {(opti.contactInfo as ContactInfo[]).map((info, i) => (
      <div key={i}>
        <span>{info.label}</span>
        <span>{info.value}</span>
      </div>
    ))}
  </div>
)}
```

### Content Array Items

When mapping over content arrays, the items may need explicit type casting:

```typescript
{opti.items.map((item, index) => {
  // Cast to the expected type
  const accordionItem = item as unknown as Infer<typeof AccordionItemType>;

  return (
    <div key={index}>
      {accordionItem.question}
      {accordionItem.answer}
    </div>
  );
})}
```

## Component Patterns

### Container + Item Pattern

Some components require both a container and item content type (e.g., AccordionBlock + AccordionItem).

**1. Create the item component:**
```typescript
// AccordionItem.tsx
export const AccordionItemType = contentType({
  key: "AccordionItem",
  baseType: "_component",
  properties: {
    question: { type: "string", displayName: "Question" },
    answer: { type: "string", displayName: "Answer" },
  },
});

// Data-only component (not rendered directly)
export default function AccordionItem({ opti }: Props) {
  return null;
}
```

**2. Reference it in the container:**
```typescript
// AccordionBlock.tsx
import { AccordionItemType } from "./AccordionItem";

export const AccordionBlockType = contentType({
  key: "AccordionBlock",
  baseType: "_component",
  properties: {
    items: {
      type: "array",
      items: {
        type: "content",
        allowedTypes: [AccordionItemType],
      },
    },
  },
});
```

**3. Register BOTH in layout.tsx:**
```typescript
import AccordionBlock, { AccordionBlockType } from "@/components/AccordionBlock";
import AccordionItem, { AccordionItemType } from "@/components/AccordionItem";

initContentTypeRegistry([
  AccordionBlockType,
  AccordionItemType,  // Don't forget this!
]);

initReactComponentRegistry({
  resolver: {
    AccordionBlock,
    AccordionItem,  // And this!
  },
});
```

## Common Type Patterns Quick Reference

| Scenario | Solution |
|----------|----------|
| URL for Link href | `opti.url?.default \|\| "#"` |
| URL for iframe src | `opti.embedUrl?.default \|\| ""` |
| Boolean for HTML attrs | `opti.autoplay === true` |
| JSON array | `Array.isArray(opti.items) && (opti.items as MyType[]).map(...)` |
| Content array items | `item as unknown as Infer<typeof ItemType>` |
| Numeric types | Use `"integer"` or `"float"`, NOT `"number"` |
| Default values | Handle in component, NOT in schema |
| Null checks | `opti.value !== null && opti.value !== undefined` |

## Property Type Cheat Sheet

| What You Need | Type to Use | Example |
|---------------|-------------|---------|
| Number field | `"integer"` or `"float"` | Rating, price, quantity |
| Simple URL | `"url"` | External link |
| Rich link | `"link"` | Link with text + target |
| Simple data array | `"json"` | Contact info, stats |
| Content array | `"array"` with `items: { type: "content" }` | Related articles |
| Single content | `"content"` | Featured image |
| Typed component | `"component"` with `contentType: MyType` | SEO block |

## When to Use Each Content Property Type

### `type: "content"` vs `type: "contentReference"`

Both reference other content, but with different purposes:

**Use `"contentReference"`** for media and assets:
```typescript
featuredImage: {
  type: "contentReference",
  displayName: "Featured Image",
  allowedTypes: ["_image"],
}
```

**Use `"content"`** for components and content blocks:
```typescript
hero: {
  type: "content",
  displayName: "Hero Section",
  allowedTypes: [HeroBlockType],
}
```

### `type: "component"` for Strong Typing

Use `"component"` when you want strong typing and always reference a specific type:

```typescript
import { SeoBlockType } from "./SeoBlock";

seo: {
  type: "component",
  contentType: SeoBlockType,  // Strongly typed
  displayName: "SEO Settings",
}
```

## After Making Changes

After adding or modifying content types:

1. **Restart dev server** if types aren't recognized
2. **Run `npm run cms:push-config`** to sync with CMS
3. **Check `definitions.json`** (auto-generated, don't edit)
4. **Use `cms:push-config-force`** if there are conflicts

## InferredContentReference vs InferredUrl

The SDK has different inferred types for different scenarios:

```typescript
// For contentReference properties (images, media)
featuredImage: InferredContentReference | null

// For url properties
websiteUrl: InferredUrl | null

// Access the actual URL from InferredUrl
const url = opti.websiteUrl?.default || "";

// Access image URL from contentReference
const imageUrl = opti.featuredImage?.url;
```
