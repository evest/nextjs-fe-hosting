"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import LocaleSwitcher from "./LocaleSwitcher";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  href: string;
  children?: MenuItem[];
}

function MobileMenuItem({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className="block px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-expanded={isOpen}
      >
        {item.label}
        <ChevronDown
          className={cn("w-5 h-5 transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className="bg-secondary border-l-4 border-border">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
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

interface MobileMenuProps {
  items: MenuItem[];
}

export default function MobileMenu({ items }: MobileMenuProps) {
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock + Escape-to-close while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={t("toggleMenu")}
      >
        <Menu className="w-6 h-6" aria-hidden />
      </button>

      {open && (
        <div
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-label={t("toggleMenu")}
          className="md:hidden fixed inset-0 z-50 flex flex-col bg-background"
        >
          <div className="flex items-center justify-end border-b border-border h-16 px-4">
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={t("toggleMenu")}
            >
              <X className="w-6 h-6" aria-hidden />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {items.map((item) => (
              <MobileMenuItem key={item.href} item={item} onNavigate={close} />
            ))}
          </nav>
          <div className="border-t border-border px-4 py-3">
            <LocaleSwitcher />
          </div>
        </div>
      )}
    </>
  );
}
