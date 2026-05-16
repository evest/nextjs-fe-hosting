import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Logo from "./Logo";
import { Container, XIcon, LinkedInIcon, GitHubIcon } from "@/components/ui";

const socialLinks = [
  { label: "X", href: "https://x.com", Icon: XIcon },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: LinkedInIcon },
  { label: "GitHub", href: "https://github.com", Icon: GitHubIcon },
];

// Captured at module load (= build time when prerendered, = container start
// otherwise). cacheComponents disallows `new Date()` directly in render bodies.
const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const tHeader = useTranslations("Header");
  const tFooter = useTranslations("Footer");

  // Pull localized labels + slugs from messages — Header carries the
  // canonical service/insight paths, Footer adds company + legal items.
  const fromHeader = (key: string) => ({ label: tHeader(`${key}.label`), href: tHeader(`${key}.href`) });
  const fromFooter = (key: string) => ({ label: tFooter(`links.${key}.label`), href: tFooter(`links.${key}.href`) });

  const sections = [
    {
      title: tFooter("sections.services"),
      links: [
        fromHeader("submenu.strategy"),
        fromHeader("submenu.implementation"),
        fromHeader("submenu.optimization"),
        fromHeader("submenu.training"),
      ],
    },
    {
      title: tFooter("sections.insights"),
      links: [
        fromHeader("submenu.blog"),
        fromHeader("submenu.caseStudies"),
        fromHeader("submenu.guides"),
      ],
    },
    {
      title: tFooter("sections.company"),
      links: [fromFooter("about"), fromFooter("careers"), fromFooter("contact")],
    },
    {
      title: tFooter("sections.legal"),
      links: [fromFooter("privacy"), fromFooter("cookies"), fromFooter("terms")],
    },
  ];

  return (
    <footer className="bg-footer text-footer-foreground">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Logo variant="footer" className="brightness-0 invert" />
            </div>
            <p className="text-sm text-footer-muted mb-6 max-w-xs">
              {tFooter("tagline")}
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
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-footer-heading uppercase tracking-wider mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.href}`}>
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
              &copy; {CURRENT_YEAR} Content Gurus. {tFooter("rights")}
            </p>
            <div className="flex items-center space-x-6">
              <Link
                href={tFooter("links.privacy.href")}
                className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
              >
                {tFooter("links.privacy.label")}
              </Link>
              <Link
                href={tFooter("links.terms.href")}
                className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
              >
                {tFooter("links.terms.label")}
              </Link>
              {process.env.OPTIMIZELY_CMS_URL && (
                <a
                  href={process.env.OPTIMIZELY_CMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-footer-muted hover:text-footer-heading transition-colors"
                >
                  {tFooter("links.edit.label")}
                </a>
              )}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
