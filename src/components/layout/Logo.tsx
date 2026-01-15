"use client";

import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "header" | "footer";
  className?: string;
}

export default function Logo({ variant = "header", className = "" }: LogoProps) {
  // Logo SVG has aspect ratio ~7.6:1 (1247:164 from viewBox)
  const config = {
    header: { src: "/logo.svg", width: 200, height: 26 },
    footer: { src: "/logo-ou.svg", width: 160, height: 21 },
  };

  const { src, width, height } = config[variant];

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt="Content Gurus"
        width={width}
        height={height}
        priority={variant === "header"}
      />
    </Link>
  );
}
