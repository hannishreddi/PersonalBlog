import Link from "next/link";
import { ArrowUp, Rss } from "lucide-react";

import { SunMark } from "@/components/layout/sun-mark";
import { siteConfig } from "@/config/site";

const FOOTER_LINKS = [
  { href: "/", label: "Latest writing" },
  { href: "/topics", label: "Topics" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
] as const;

const linkClass =
  "text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline hover:decoration-orange hover:decoration-2";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-edge bg-peach">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2.5 font-serif text-2xl font-bold text-ink">
            <SunMark className="size-8 shrink-0" />
            {siteConfig.name}
          </p>
          <p className="mt-3 max-w-sm text-ink-soft">{siteConfig.tagline}</p>
          <p className="mt-5 -rotate-2 font-hand text-2xl text-accent">thanks for reading ♥</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-bold tracking-[0.18em] text-ink-muted uppercase">Explore</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-bold tracking-[0.18em] text-ink-muted uppercase">Follow along</h2>
          <p className="mt-4 text-ink-soft">New writing lands in the RSS feed as soon as it&rsquo;s published.</p>
          <a href="/feed.xml" className="btn btn-primary sticker sticker-hover mt-4">
            <Rss aria-hidden="true" className="size-4" />
            RSS feed
          </a>
        </div>
      </div>

      <div className="border-t-2 border-edge/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm text-ink-muted sm:px-8">
          <p>
            © {siteConfig.name}
          </p>
          <a href="#main" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
            Back to top
            <ArrowUp aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
