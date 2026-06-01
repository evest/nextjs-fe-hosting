"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface LogoProps {
  variant?: "header" | "footer";
  className?: string;
  // Whether to eager-load the logo (sets next/image `priority`, i.e.
  // fetchpriority="high" + no lazy-loading). Defaults per variant: the header
  // logo is always above the fold, so it's eager. The footer logo defaults to
  // eager too because on short pages the footer reaches the viewport early and
  // Next flagged /logo-ou.svg as the LCP element; lazy-loading the LCP image
  // delays it. Callers on long, content-heavy pages can pass `priority={false}`
  // to opt the footer logo back into lazy loading.
  priority?: boolean;
}

export default function Logo({ variant = "header", className = "", priority }: LogoProps) {
  // Logo SVG has aspect ratio ~7.6:1 (1247:164 from viewBox)
  const config = {
    header: { src: "/logo.svg", width: 200, height: 26 },
    footer: { src: "/logo-ou.svg", width: 160, height: 21 },
  };

  const { src, width, height } = config[variant];
  const isPriority = priority ?? true;

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt="Content Gurus"
        width={width}
        height={height}
        priority={isPriority}
      />
    </Link>
  );
}
