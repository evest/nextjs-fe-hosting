import { notFound } from 'next/navigation';
import type { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { Container } from '@/components/ui';
import { SiteSettingsCT } from '@/content-types/SiteSettings';

// SiteSettings is a singleton _page consumed by buildJsonLd / llms.txt only —
// it has no public rendering. On the live site we still 404 (a settings page
// must never leak its payload at a routable URL). But inside the CMS editor
// (preview/edit mode) we render a read-only "what each field is for" reference
// so editors understand what they're editing instead of staring at a 404 or a
// bare form. The view is driven entirely off the SiteSettingsCT definition, so
// adding/renaming a property or editing its `description` keeps this page in
// sync automatically.

type Props = {
  content: ContentProps<typeof SiteSettingsCT> & {
    __context?: { edit?: boolean };
  };
};

// Group metadata lives in the property definitions (`group: 'organization'`).
// Anything without a group is the top-level / "general" set. Titles are
// hand-labelled here because the CT schema doesn't carry group display names.
const GROUP_LABELS: Record<string, string> = {
  _general: 'General',
  organization: 'Organization (schema.org)',
  experimentation: 'Experimentation',
};

type PropertyDef = {
  type: string;
  displayName?: string;
  description?: string;
  isLocalized?: boolean;
  group?: string;
  sortOrder?: number;
  items?: { type?: string };
};

/** Render a property's current value as readable text, by property type. */
function formatValue(def: PropertyDef, value: unknown): { text: string; isEmpty: boolean } {
  if (value === null || value === undefined || value === '') {
    return { text: '— not set —', isEmpty: true };
  }

  // contentReference (logo, defaultOgImage) → resolved asset with a URL.
  if (def.type === 'contentReference') {
    const url =
      (value as { url?: { default?: string } })?.url?.default ??
      (typeof value === 'string' ? value : null);
    return url ? { text: url, isEmpty: false } : { text: '— not set —', isEmpty: true };
  }

  // array of urls (sameAs) → list each resolved URL.
  if (def.type === 'array' && Array.isArray(value)) {
    const urls = value
      .map((v) => (typeof v === 'string' ? v : (v as { default?: string })?.default ?? null))
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    if (urls.length === 0) return { text: '— not set —', isEmpty: true };
    return { text: urls.join('\n'), isEmpty: false };
  }

  return { text: String(value), isEmpty: false };
}

function PropertyRow({
  name,
  def,
  value,
  pa,
}: {
  name: string;
  def: PropertyDef;
  value: unknown;
  pa: (property: string) => Record<string, string>;
}) {
  const { text, isEmpty } = formatValue(def, value);
  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      {...pa(name)}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {def.displayName ?? name}
        </h3>
        <code className="text-xs text-muted-foreground">{name}</code>
        {def.isLocalized && (
          <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand">
            per-language
          </span>
        )}
      </div>

      {def.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {def.description}
        </p>
      )}

      <dl className="mt-3">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Current value
        </dt>
        <dd
          className={
            isEmpty
              ? 'mt-0.5 text-sm italic text-muted-foreground'
              : 'mt-0.5 whitespace-pre-wrap wrap-break-word text-sm text-foreground'
          }
        >
          {text}
        </dd>
      </dl>
    </div>
  );
}

export default function SiteSettings({ content }: Props) {
  // Live site (no editor context) → never render; settings are not browsable.
  if (!content?.__context?.edit) {
    notFound();
  }

  const { pa } = getPreviewUtils(content);
  const properties = SiteSettingsCT.properties as Record<string, PropertyDef>;

  // Order properties by sortOrder, then bucket into groups (preserving order).
  const ordered = Object.entries(properties).sort(
    ([, a], [, b]) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const groups = new Map<string, [string, PropertyDef][]>();
  for (const entry of ordered) {
    const groupKey = entry[1].group ?? '_general';
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(entry);
  }

  return (
    <main className="flex-1 bg-background py-10">
      <Container className="max-w-3xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Editor reference — not a public page
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {SiteSettingsCT.displayName ?? 'Site Settings'}
          </h1>
          {SiteSettingsCT.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {SiteSettingsCT.description}
            </p>
          )}
          <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            This page only renders inside the CMS editor. On the live site the URL
            returns 404 — these values are consumed by structured data (JSON-LD)
            and the <code>/llms.txt</code> index, not shown directly to visitors.
            Fields marked <span className="font-medium text-brand">per-language</span> are
            edited separately for each locale.
          </p>
        </header>

        <div className="space-y-8">
          {Array.from(groups.entries()).map(([groupKey, entries]) => (
            <section key={groupKey}>
              <h2 className="mb-3 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[groupKey] ?? groupKey}
              </h2>
              <div className="space-y-3">
                {entries.map(([name, def]) => (
                  <PropertyRow
                    key={name}
                    name={name}
                    def={def}
                    value={(content as Record<string, unknown>)[name]}
                    pa={pa as (property: string) => Record<string, string>}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
