import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
// To restore the Manrope body font: re-add `Manrope` to this import.
// import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";

// Initialize Optimizely SDK registries
import "@/optimizely";
import { getWebExperimentationSnippetId } from "@/lib/optimizely/get-site-settings";

// Fonts: the editorial serif (--font-display) is the ONLY remaining webfont.
// Removed for performance (each shipped @font-face rules into the single
// render-blocking CSS chunk and triggered downloads):
//   - Geist Sans / Geist Mono — Geist Sans rendered nowhere (body = Arial
//     system stack); Geist Mono was internal /diagnostics tooling only.
//   - Manrope (--font-body) — used only on the AdvancedHero section, where it
//     was the HOME PAGE LCP element. As a webfont, the LCP text waited for the
//     Manrope swap (after the CSS parse discovered its @font-face), holding
//     mobile LCP near the FCP+swap mark. Dropping it makes that text paint
//     instantly in a system sans, the same as the article page. --font-body now
//     resolves to a system stack in globals.css.
//
// To RESTORE Manrope: uncomment the import above + the `manrope` const below,
// re-add `${manrope.variable}` to the <body> className, and repoint
// --font-body to var(--font-manrope) in globals.css.
//
// const manrope = Manrope({
//   variable: "--font-manrope",
//   subsets: ["latin"],
//   display: "swap",
// });

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

// metadataBase makes per-page openGraph.images and alternates.canonical
// resolve as absolute URLs. Defaults to http://localhost:3000 in local dev
// so the Next.js warning ("metadataBase property … not set") stays quiet.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Content Gurus";

// Cross-origin hosts that serve LCP-critical images, warmed with <preconnect>
// so the first image request skips the DNS+TCP+TLS handshake (≈3 RTTs, easily
// 300–600ms on throttled mobile) — it overlaps the handshake with HTML/CSS
// parsing instead of paying it serially before the hero/card images load.
//   - CMS asset zone: derived from OPTIMIZELY_CMS_URL (the managed-asset origin,
//     e.g. https://app-….cms.optimizely.com) — hero + card images.
//   - DAM/CMP zone: author avatars and inline content images. The subdomain
//     varies (images3.cmp…), so this warms the most common one; a miss just
//     means that one host isn't pre-warmed, never a broken request.
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
const cmsImageOrigin = originOf(process.env.OPTIMIZELY_CMS_URL);
const damImageOrigin = "https://images3.cmp.optimizely.com";

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
        {/* Warm the cross-origin image CDNs before the first image request.
            crossOrigin is required: next/image fetches are anonymous CORS, so a
            preconnect without it opens a separate, unused connection. */}
        {cmsImageOrigin && (
          <link rel="preconnect" href={cmsImageOrigin} crossOrigin="anonymous" />
        )}
        <link rel="preconnect" href={damImageOrigin} crossOrigin="anonymous" />
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
        className={`${instrumentSerif.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
