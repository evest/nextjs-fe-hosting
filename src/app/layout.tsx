import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";

// Initialize Optimizely SDK registries
import "@/optimizely";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif used by the Advanced Hero headline.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content Gurus",
  description: "Optimizely SaaS CMS expertise for Nordic brands.",
};

// Optimizely Web Experimentation snippet ID, sourced from env so branches /
// preview deploys can opt out by leaving it blank. Format-validated against
// Optimizely's alphanumeric ID shape — anything else is treated as missing
// and the snippet is not rendered.
const rawSnippetId = process.env.OPTIMIZELY_WEB_EXP_SNIPPET_ID;
const webExpSnippetId =
  rawSnippetId && /^[A-Za-z0-9_-]{1,32}$/.test(rawSnippetId) ? rawSnippetId : null;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
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
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${manrope.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
