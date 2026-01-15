"use client";

import { useState, useRef, useEffect } from "react";
import Logo from "./Logo";
import Link from "next/link";

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
  {
    label: "About",
    href: "/en/about",
  },
  {
    label: "Contact",
    href: "/en/contact",
  },
];

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface DesktopMenuItemProps {
  item: MenuItem;
}

function DesktopMenuItem({ item }: DesktopMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
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
        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {item.label}
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface MobileMenuItemProps {
  item: MenuItem;
}

function MobileMenuItem({ item }: MobileMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        aria-expanded={isOpen}
      >
        {item.label}
        <ChevronDownIcon
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="bg-gray-50 border-l-4 border-gray-200">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
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
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo variant="header" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.href} item={item} />
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <CloseIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-200 bg-white">
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
