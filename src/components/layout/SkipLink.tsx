import { useTranslations } from "next-intl";

interface SkipLinkProps {
  href?: string;
}

export default function SkipLink({ href = "#main-content" }: SkipLinkProps) {
  const t = useTranslations("Header");
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-foreground focus:text-background focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("skipToContent")}
    </a>
  );
}
