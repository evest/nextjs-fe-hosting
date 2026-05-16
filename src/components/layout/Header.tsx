"use client";

import { useState, useRef, useEffect } from "react";
import Logo from "./Logo";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  href: string;
  children?: MenuItem[];
}

// Sample navigation data - in a real app, this could come from CMS or config
const menuItems: MenuItem[] = [
  {
    label: "Products",
    href: "/en/products",
    children: [
      { label: "Featured", href: "/en/products/featured" },
      { label: "New Arrivals", href: "/en/products/new" },
      { label: "Best Sellers", href: "/en/products/best-sellers" },
    ],
  },
  {
    label: "Solutions",
    href: "/en/solutions",
    children: [
      { label: "Enterprise", href: "/en/solutions/enterprise" },
      { label: "Small Business", href: "/en/solutions/small-business" },
      { label: "Developers", href: "/en/solutions/developers" },
    ],
  },
  {
    label: "Resources",
    href: "/en/resources",
    children: [
      { label: "Documentation", href: "/en/resources/docs" },
      { label: "Blog", href: "/en/resources/blog" },
      { label: "Case Studies", href: "/en/resources/case-studies" },
    ],
  },
  { label: "About", href: "/en/about" },
  { label: "Contact", href: "/en/contact" },
];

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
        <div className="absolute top-full left-0 mt-1 w-48 bg-background rounded-lg shadow-lg border border-border py-2 z-50">
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

function MobileMenuItem({ item }: { item: MenuItem }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="block px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-expanded={isOpen}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "w-5 h-5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="bg-secondary border-l-4 border-border">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-8 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <Container>
        <div className="flex items-center justify-between h-16">
          <Logo variant="header" />

          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.href} item={item} />
            ))}
          </nav>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </Container>

      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-background">
          <div className="py-2">
            {menuItems.map((item) => (
              <MobileMenuItem key={item.href} item={item} />
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
