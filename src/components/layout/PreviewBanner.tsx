'use client';

// Shown only on the /preview route. The CMS editing iframe doesn't always
// re-fetch on save, so a manual reload is the reliable way to pull the
// latest draft.
export default function PreviewBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-accent px-4 py-2 text-center text-sm text-accent-foreground">
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
