"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const switchTo = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    // params is whatever the current dynamic segments are — pass them through
    // so next-intl preserves [[...slug]] when swapping locales.
    router.replace(
      // @ts-expect-error -- pathname is typed as a Pathnames key; here we
      // just pass the current path verbatim to preserve dynamic slugs.
      { pathname, params },
      { locale: next }
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
      >
        {locale}
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-1 w-40 bg-background border border-border rounded-lg shadow-lg py-1 z-50"
        >
          {routing.locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => switchTo(l)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-secondary hover:text-foreground transition-colors",
                  l === locale && "font-semibold"
                )}
              >
                <span>{t(l)}</span>
                <span className="uppercase tracking-wider text-muted-foreground">{l}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
