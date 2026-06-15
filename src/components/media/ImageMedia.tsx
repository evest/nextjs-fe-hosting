import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { Container } from '@/components/ui';
import { getImageMediaMeta } from '@/lib/optimizely/get-image-media-meta';

// Editor preview for the built-in `ImageMedia` asset type.
//
// `ImageMedia` is a CMS *built-in* (an uploaded image file), not a content type
// we author — so it has no definition in src/content-types and isn't pushed via
// the CLI. It's referenced by pages/blocks/elements through contentReference
// fields and rendered there via getPreviewUtils().src(); this component is NOT
// part of that path.
//
// It only renders when an ImageMedia item is itself the content passed to
// <OptimizelyComponent> — which happens solely when an editor opens the asset
// in the CMS preview/edit view (src/app/preview/page.tsx). On the live site an
// image is always a reference inside a parent page, never the routed content, so
// registering this component cannot change how images appear to end users.
// Before this existed, opening an ImageMedia in preview hit the SDK's
// "No component found" fallback; now editors get the image + its metadata.

// ImageMedia's Graph shape (built-in type — no generated CT to Infer from).
// __typename / __context mirror the fields getPreviewUtils() reads.
type ImageMediaContent = {
  __typename: string;
  __context?: { edit: boolean; preview_token: string };
  // _metadata is reliably fetched for a registered media type (the SDK's
  // base-type fragments include MediaMetadata via an inline fragment): so
  // displayName, url, mimeType, status, dates are dependable here.
  _metadata?: {
    key?: string | null;
    displayName?: string | null;
    url?: { default?: string | null } | null;
    types?: (string | null)[] | null;
    status?: string | null;
    created?: string | null;
    lastModified?: string | null;
    mimeType?: string | null;
  } | null;
  // _assetMetadata / _imageMetadata are top-level ImageMedia fields, NOT part
  // of the base-type fragments — so they may be absent depending on how the
  // payload was fetched. Read as best-effort; the UI shows "— not set —" when
  // missing rather than failing.
  _assetMetadata?: {
    fileSize?: number | null;
    mimeType?: string | null;
    url?: string | null;
  } | null;
  _imageMetadata?: {
    width?: number | null;
    height?: number | null;
  } | null;
};

type Props = {
  content: ImageMediaContent;
};

function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes == null || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unit]}`;
}

// Derive a filename from an asset URL. CMS asset URLs are either
// `.../globalassets/content-journey-mapping.png` (filename in the last segment)
// or `.../globalassets/blog-og-image--.../ ` (a route-segment folder with no
// extension). Return the last non-empty path segment; null if there isn't one.
function filenameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

// Map a MIME type to a file extension for assets whose URL carries no
// extension (route-segment folder URLs). e.g. "image/png" -> "PNG".
function formatFromMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const sub = mime.split('/')[1];
  if (!sub) return null;
  return sub.replace('jpeg', 'jpg').toUpperCase();
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value == null || value === '';
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:w-40 sm:shrink-0 sm:pt-0.5">
        {label}
      </dt>
      <dd className={empty ? 'text-sm italic text-muted-foreground' : 'wrap-break-word text-sm text-foreground'}>
        {empty ? '— not set —' : value}
      </dd>
    </div>
  );
}

// Colour the status by publish state: green when Published, amber otherwise
// (Draft / InReview / Scheduled / Rejected / Expired — i.e. not live), so an
// editor instantly sees whether the image is published. Null status → muted.
function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm italic text-muted-foreground">— not set —</span>;
  const isPublished = status.toLowerCase() === 'published';
  const cls = isPublished
    ? 'bg-green-100 text-green-800'
    : 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export default async function ImageMedia({ content }: Props) {
  const { src } = getPreviewUtils(content);

  const meta = content._metadata ?? {};
  const asset = content._assetMetadata ?? {};
  const inlineImage = content._imageMetadata ?? {};

  // The SDK preview payload omits _imageMetadata/_assetMetadata, so fetch them
  // by content key (proven to return width/height/fileSize). Merge: prefer any
  // values already in the payload, fall back to the separate fetch. Degrades to
  // the inline (possibly empty) values if the asset isn't indexed yet.
  const extra = await getImageMediaMeta(meta.key);
  const image = {
    width: inlineImage.width ?? extra?.width ?? null,
    height: inlineImage.height ?? extra?.height ?? null,
  };
  const fileSizeBytes = asset.fileSize ?? extra?.fileSize ?? null;

  // src() appends the preview token in edit mode so the asset URL resolves in
  // the CMS preview iframe. Prefer the asset URL, fall back to the metadata URL.
  const imageUrl = src(asset.url ?? meta.url?.default ?? undefined);

  const displayName = meta.displayName ?? 'Untitled image';
  // The CMS display name often has no file extension (it's an editor-given
  // title, not the filename). Surface the real filename (from the asset URL)
  // and the format (from MIME) separately so editors aren't confused by a
  // name like "Information Architecture Hero" with no .png/.jpg.
  const assetUrl = asset.url ?? meta.url?.default ?? null;
  const filename = filenameFromUrl(assetUrl);
  const mimeType = meta.mimeType ?? asset.mimeType ?? null;
  const format = formatFromMime(mimeType);
  const dimensions =
    image.width != null && image.height != null ? `${image.width} × ${image.height} px` : null;
  const fileSize = formatFileSize(fileSizeBytes);
  const aspectRatio =
    image.width != null && image.height != null && image.height !== 0
      ? (image.width / image.height).toFixed(2)
      : null;

  return (
    <main className="flex-1 bg-background py-10">
      <Container className="max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Editor reference — image asset
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Preview of this image asset and its metadata. This view is shown when
            you open the asset in the CMS — it is not a public page, and it does
            not affect how the image appears where it&apos;s used on the site.
          </p>
        </header>

        {imageUrl ? (
          // Plain <img>, not next/image: this is an editor-only preview of an
          // arbitrary-dimension asset on the CMS host; the custom next/image
          // loader/responsive pipeline adds nothing here and we want the asset
          // shown exactly as stored. Checkerboard background reveals transparency.
          <div
            className="mb-6 overflow-hidden rounded-lg border border-border"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={displayName}
              className="mx-auto block h-auto max-h-[60vh] w-auto max-w-full"
            />
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            No image URL available for this asset.
          </div>
        )}

        <section>
          <h2 className="mb-2 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </h2>
          <dl>
            <MetaRow label="Name" value={meta.displayName} />
            <MetaRow label="Filename" value={filename} />
            <MetaRow label="Format" value={format} />
            <MetaRow label="Dimensions" value={dimensions} />
            <MetaRow label="Aspect ratio" value={aspectRatio} />
            <MetaRow label="File size" value={fileSize} />
            <MetaRow label="MIME type" value={mimeType} />
            <MetaRow label="Status" value={<StatusBadge status={meta.status} />} />
            <MetaRow label="Created" value={formatDate(meta.created)} />
            <MetaRow label="Last modified" value={formatDate(meta.lastModified)} />
            <MetaRow
              label="URL"
              value={
                meta.url?.default ? (
                  <a
                    href={meta.url.default}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline underline-offset-2"
                  >
                    {meta.url.default}
                  </a>
                ) : null
              }
            />
          </dl>
        </section>
      </Container>
    </main>
  );
}
