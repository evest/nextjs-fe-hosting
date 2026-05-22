"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import Logo from "./Logo";
import LocaleSwitcher from "./LocaleSwitcher";
import MobileMenu, { type MenuItem } from "./MobileMenu";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

function DesktopMenuItem({ item }: { item: MenuItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {item.label}
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-background rounded-lg shadow-lg border border-border py-2 z-50">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function buildMenuItems(t: ReturnType<typeof useTranslations<"Header">>): MenuItem[] {
  const get = (key: string) => ({ label: t(`${key}.label`), href: t(`${key}.href`) });
  return [
    {
      ...get("nav.services"),
      children: [
        get("submenu.strategy"),
        get("submenu.implementation"),
        get("submenu.optimization"),
        get("submenu.training"),
      ],
    },
    {
      ...get("nav.insights"),
      children: [
        get("submenu.blog"),
        get("submenu.caseStudies"),
        get("submenu.guides"),
      ],
    },
    get("nav.about"),
    get("nav.contact"),
  ];
}

export default function Header() {
  const t = useTranslations("Header");
  const menuItems = buildMenuItems(t);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll(); // sync on mount (e.g. reload mid-page)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled ? "" : undefined}
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled
          ? "bg-background border-b border-border"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <Container>
        <div className="flex items-center justify-between h-16">
          <Logo variant="header" />

          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.href} item={item} />
            ))}
            <span className="mx-2 h-5 w-px bg-border" aria-hidden />
            <LocaleSwitcher />
          </nav>

          <MobileMenu items={menuItems} />
        </div>
      </Container>
    </header>
  );
}
