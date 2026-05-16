// Curated allowlist of Lucide icons available to editors.
//
// To add an icon:
//   1. Pick a name from https://lucide.dev/icons/ (use the kebab-case slug).
//   2. Add the entry below in the most appropriate group.
//   3. Add the matching PascalCase import + map entry in `icon-map.ts`.
//
// Two consumers read this list:
//   - Content type schemas (`SolutionTile`, `ProcessBlock`) use `ICON_ENUM`
//     to render a dropdown in the CMS editor.
//   - The runtime icon renderer reads `ICON_MAP` in `icon-map.ts`.
//
// This file MUST NOT import `lucide-react` — content type schemas are
// evaluated by the CMS CLI at push time and should stay free of React deps.
//
// Tuned for Content Gurus: strategy, content, implementation, optimisation,
// training, analytics, trust, and the supporting comms/locale icons a Nordic
// Optimizely consultancy actually reaches for. Kept under ~50 entries so the
// editor dropdown stays scannable.

type IconEntry = { name: string; displayName: string; group: string };

export const ICONS = [
  // Strategy & ideas
  { name: 'lightbulb', displayName: 'Lightbulb', group: 'Strategy' },
  { name: 'compass', displayName: 'Compass', group: 'Strategy' },
  { name: 'target', displayName: 'Target', group: 'Strategy' },
  { name: 'sparkles', displayName: 'Sparkles', group: 'Strategy' },
  { name: 'route', displayName: 'Route', group: 'Strategy' },

  // Content & writing
  { name: 'file-text', displayName: 'File text', group: 'Content' },
  { name: 'book-open', displayName: 'Book open', group: 'Content' },
  { name: 'pen-tool', displayName: 'Pen tool', group: 'Content' },
  { name: 'type', displayName: 'Type', group: 'Content' },
  { name: 'layout-template', displayName: 'Layout template', group: 'Content' },

  // Build / implementation
  { name: 'code-xml', displayName: 'Code', group: 'Build' },
  { name: 'settings', displayName: 'Settings', group: 'Build' },
  { name: 'blocks', displayName: 'Blocks', group: 'Build' },
  { name: 'plug', displayName: 'Plug', group: 'Build' },
  { name: 'workflow', displayName: 'Workflow', group: 'Build' },
  { name: 'wrench', displayName: 'Wrench', group: 'Build' },

  // Optimisation & experimentation
  { name: 'trending-up', displayName: 'Trending up', group: 'Optimisation' },
  { name: 'flask-conical', displayName: 'Flask (experiment)', group: 'Optimisation' },
  { name: 'gauge', displayName: 'Gauge', group: 'Optimisation' },
  { name: 'activity', displayName: 'Activity', group: 'Optimisation' },
  { name: 'zap', displayName: 'Zap', group: 'Optimisation' },

  // Analytics
  { name: 'chart-bar', displayName: 'Bar chart', group: 'Analytics' },
  { name: 'chart-line', displayName: 'Line chart', group: 'Analytics' },
  { name: 'eye', displayName: 'Eye', group: 'Analytics' },
  { name: 'search', displayName: 'Search', group: 'Analytics' },

  // Audience & users
  { name: 'users', displayName: 'Users', group: 'Audience' },
  { name: 'user-plus', displayName: 'User plus', group: 'Audience' },
  { name: 'megaphone', displayName: 'Megaphone', group: 'Audience' },
  { name: 'message-square-text', displayName: 'Message', group: 'Audience' },

  // Training & learning
  { name: 'graduation-cap', displayName: 'Graduation cap', group: 'Training' },
  { name: 'presentation', displayName: 'Presentation', group: 'Training' },
  { name: 'play-circle', displayName: 'Play', group: 'Training' },

  // Quality & trust
  { name: 'shield-check', displayName: 'Shield check', group: 'Trust' },
  { name: 'badge-check', displayName: 'Badge check', group: 'Trust' },
  { name: 'award', displayName: 'Award', group: 'Trust' },

  // Delivery & speed
  { name: 'rocket', displayName: 'Rocket', group: 'Delivery' },
  { name: 'timer', displayName: 'Timer', group: 'Delivery' },

  // Global / multi-locale
  { name: 'globe', displayName: 'Globe', group: 'Global' },
  { name: 'languages', displayName: 'Languages', group: 'Global' },

  // Comms & contact
  { name: 'mail', displayName: 'Mail', group: 'Comms' },
  { name: 'phone', displayName: 'Phone', group: 'Comms' },
  { name: 'calendar', displayName: 'Calendar', group: 'Comms' },

  // Architecture / cloud
  { name: 'cloud', displayName: 'Cloud', group: 'Architecture' },
  { name: 'server', displayName: 'Server', group: 'Architecture' },
  { name: 'share-2', displayName: 'Share', group: 'Architecture' },
] as const satisfies readonly IconEntry[];

export type IconName = (typeof ICONS)[number]['name'];

export const ICON_NAMES: readonly IconName[] = ICONS.map((i) => i.name);

// Shape consumed by `enum` on a `string` property — value goes to the CMS,
// displayName is what editors see in the dropdown. Prefixed with the group
// so editors can scan logical clusters even if the SDK sorts alphabetically.
export const ICON_ENUM = ICONS.map((i) => ({
  value: i.name,
  displayName: `${i.group} — ${i.displayName}`,
}));
