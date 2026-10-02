'use client';

// Shown only on the /preview route. Saves normally soft-refresh via
// NextPreviewComponent; the manual reload is a fallback for when an
// update doesn't come through.
export default function PreviewBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-brand px-4 py-2 text-center text-sm text-brand-foreground">
      <span>Preview mode — you are viewing draft CMS content.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="font-semibold underline underline-offset-2 hover:opacity-80"
      >
        Refresh
      </button>
    </div>
  );
}
