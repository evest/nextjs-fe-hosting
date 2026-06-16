import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";

// Initialize Optimizely SDK registries
import "@/optimizely";
import { getWebExperimentationSnippetId } from "@/lib/optimizely/get-site-settings";

// Fonts: only the two families actually rendered on public pages are loaded as
// webfonts — the editorial serif (--font-display) and the body sans
// (--font-body). Geist Sans / Geist Mono were removed: nothing renders in Geist
// Sans (the body uses the Arial system stack, see globals.css), and Geist Mono
// was used only by internal /diagnostics + preview-error tooling. Each unused
// family added @font-face rules to the single render-blocking CSS chunk (~25
// @font-face rules, ~86 KB decoded) for no visible benefit — and on these pages
// the LCP element is system-font *text*, gated by that CSS download, not by an
// image. --font-sans / --font-mono now resolve to system stacks in globals.css
// so the Tailwind font-sans / font-mono utilities still work everywhere.

// Editorial display serif used by the Advanced Hero headline + article H1.
// `display: 'swap'` paints in the fallback immediately so the headline never
// blocks LCP waiting on the webfont download. next/font does NOT auto-emit a
// <link rel="preload"> here: the serif is only reached via the
// --font-instrument-serif CSS variable, and the preload heuristic doesn't
// connect it to the page under PPR. `swap` makes that a non-issue.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// metadataBase makes per-page openGraph.images and alternates.canonical
// resolve as absolute URLs. Defaults to http://localhost:3000 in local dev
// so the Next.js warning ("metadataBase property … not set") stays quiet.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Content Gurus";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: "Optimizely SaaS CMS expertise for Nordic brands.",
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Web Experimentation snippet ID is a runtime CMS setting
  // (SiteSettings.webExperimentationSnippetId), so editors can toggle it on/off
  // without a redeploy. Reading it here keeps the snippet parser-blocking in
  // <head> (required for anti-flicker). getWebExperimentationSnippetId() is
  // locale-agnostic and cached under the SiteSettings tag, which the
  // /hooks/graph webhook purges (whole-site) on any SiteSettings publish.
  // The CMS field is the sole source: blank field → null → no snippet.
  const webExpSnippetId = await getWebExperimentationSnippetId();

  // <html lang> is hard-coded to "en" because the root layout can't read
  // the per-request locale without breaking cacheComponents prerendering
  // (uncached request reads in the static shell are fatal). The visible
  // page content is still rendered in the correct language via next-intl;
  // this attribute is only "wrong" for /no, /sv, /da. Tracked in
  // docs/todo-html-lang-per-locale.md — Option A migration (route groups
  // with locale-specific <html>) is the proper fix.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {webExpSnippetId && (
          // Synchronous, parser-blocking, in <head> — required for the
          // anti-flicker behaviour. Do NOT switch to next/script: its
          // beforeInteractive strategy does not block hydration, and the
          // other strategies run after first paint. Audience/URL exclusions
          // (e.g. /preview) belong in the Optimizely project, not here.
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script src={`https://cdn.optimizely.com/js/${webExpSnippetId}.js`} />
        )}
      </head>
      <body
        className={`${instrumentSerif.variable} ${manrope.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
