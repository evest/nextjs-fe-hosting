import Logo from "./Logo";
import Link from "next/link";
import { Container, XIcon, LinkedInIcon, GitHubIcon } from "@/components/ui";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

// Sample footer data - in a real app, this could come from CMS or config
const footerSections: FooterSection[] = [
  {
    title: "Products",
    links: [
      { label: "Features", href: "/products/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "API", href: "/api" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Partners", href: "/partners" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "/help" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "GDPR", href: "/gdpr" },
    ],
  },
];

const socialLinks = [
  { label: "Twitter", href: "https://twitter.com", Icon: XIcon },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: LinkedInIcon },
  { label: "GitHub", href: "https://github.com", Icon: GitHubIcon },
];

// Captured at module load (= build time when prerendered, = container start
// otherwise). cacheComponents disallows `new Date()` directly in render bodies.
const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bg-footer text-footer-foreground">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Logo variant="footer" className="brightness-0 invert" />
            </div>
            <p className="text-sm text-footer-muted mb-6">
              Building better digital experiences with modern web technologies and
              content management solutions.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-footer-muted hover:text-footer-heading transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-footer-heading uppercase tracking-wider mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-footer-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-footer-muted">
              &copy; {CURRENT_YEAR} Your Company. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/sitemap"
                className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
              >
                Sitemap
              </Link>
              {process.env.OPTIMIZELY_CMS_URL && (
                <a
                  href={process.env.OPTIMIZELY_CMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
                >
                  Edit
                </a>
              )}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
