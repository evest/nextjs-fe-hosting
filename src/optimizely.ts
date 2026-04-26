/**
 * Optimizely CMS SDK initialization
 *
 * This module initializes all Optimizely registries. Import this file
 * in your root layout or instrumentation file to ensure registries
 * are set up before any CMS content is rendered.
 */

import { initContentTypeRegistry, initDisplayTemplateRegistry, BlankExperienceContentType } from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';
// This loads all the content types from the /content-types/index.ts file.
import * as contentTypes from '@/content-types';
import * as displayTemplates from '@/display-templates';
import * as components from '@/components';

// Initialize content type registry with all content types
const allContentTypes = [...Object.values(contentTypes), BlankExperienceContentType];
initContentTypeRegistry(allContentTypes);

// Initialize display template registry
initDisplayTemplateRegistry([...Object.values(displayTemplates)]);

// Initialize React component registry for server-side rendering
initReactComponentRegistry({
  resolver: {
    ArticlePage: components.ArticlePage,
    PersonPage: components.PersonPage,
    PersonElement: components.PersonElement,
    TextElement: components.TextElement,
    RichTextElement: components.RichTextElement,
    ImageElement: components.ImageElement,
    BannerElement: components.BannerElement,
    CallToActionElement: components.CallToActionElement,
    CardBlock: components.CardBlock,
    BlankExperience: components.BlankExperience,
    LandingPageExperience: components.LandingPageExperience,
    BlankSection: components.BlankSection,
  },
});
