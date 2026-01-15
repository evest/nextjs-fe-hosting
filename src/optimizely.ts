/**
 * Optimizely CMS SDK initialization
 *
 * This module initializes all Optimizely registries. Import this file
 * in your root layout or instrumentation file to ensure registries
 * are set up before any CMS content is rendered.
 */

import { initContentTypeRegistry, initDisplayTemplateRegistry, BlankExperienceContentType } from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';
import * as contentTypes from '@/content-types';
import * as displayTemplates from '@/display-templates';
import * as components from '@/components';

// Initialize content type registry with all content types
initContentTypeRegistry([...Object.values(contentTypes), BlankExperienceContentType]);

// Initialize display template registry
initDisplayTemplateRegistry([...Object.values(displayTemplates)]);

// Initialize React component registry for server-side rendering
initReactComponentRegistry({
  resolver: {
    ArticlePage: components.ArticlePage,
    TextElement: components.TextElement,
    RichTextElement: components.RichTextElement,
    ImageElement: components.ImageElement,
    CardBlock: components.CardBlock,
  },
});
