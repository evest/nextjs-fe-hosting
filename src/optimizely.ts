/**
 * Optimizely CMS SDK initialization
 *
 * This module initializes all Optimizely registries. Import this file
 * in your root layout or instrumentation file to ensure registries
 * are set up before any CMS content is rendered.
 */

import { config, initContentTypeRegistry, initDisplayTemplateRegistry, BlankExperienceContentType } from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';
// This loads all the content types from the /content-types/index.ts file.
import * as contentTypes from '@/content-types';
import * as displayTemplates from '@/display-templates';
import * as components from '@/components';
import { getGraphGatewayUrl } from '@/lib/config';

// Configure the Graph client once at app entry. Code paths that need a
// client call getClient() instead of constructing GraphClient themselves —
// this keeps the API key + gateway URL handling in one place.
if (process.env.OPTIMIZELY_GRAPH_SINGLE_KEY) {
  config({
    apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY,
    graphUrl: getGraphGatewayUrl(),
  });
}

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
    PageCardElement: components.PageCardElement,
    BlankExperience: components.BlankExperience,
    LandingPageExperience: components.LandingPageExperience,
    BlankSection: components.BlankSection,

    // Marketing blocks (Phase 4)
    HeroBlock: components.HeroBlock,
    StatsBlock: components.StatsBlock,
    TestimonialBlock: components.TestimonialBlock,
    ProcessBlock: components.ProcessBlock,
    CalloutBanner: components.CalloutBanner,
    SolutionTile: components.SolutionTile,
    SolutionsGrid: components.SolutionsGrid,
    PartnerLogos: components.PartnerLogos,
    AccordionItem: components.AccordionItem,
    AccordionBlock: components.AccordionBlock,

    // Phase 5a
    ArticleListBlock: components.ArticleListBlock,

    // Phase 5b
    ContactFormBlock: components.ContactFormBlock,
  },
});
