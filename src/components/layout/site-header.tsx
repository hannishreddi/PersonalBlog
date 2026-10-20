import Link from "next/link";
import { Search } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SunMark } from "@/components/layout/sun-mark";
import { siteConfig } from "@/config/site";

const NAV_LINKS = [
  { href: "/", label: "Writing" },
  { href: "/topics", label: "Topics" },
  { href: "/about", label: "About" },
] as const;

const navLinkClass =
  "rounded-full px-3 py-1.5 font-semibold text-ink transition-colors hover:bg-paper-raised hover:underline hover:decoration-orange hover:decoration-2 hover:underline-offset-4";

export function SiteHeader() {
  return (
    <header className="border-b-2 border-edge bg-peach">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-3 sm:gap-x-6 px-5 py-4 sm:px-8 sm:py-5">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-serif text-[1.25rem] font-bold sm:gap-2.5 tracking-[-0.01em] text-ink sm:text-[1.6rem]"
        >
          <SunMark className="size-7 shrink-0 transition-transform duration-500 group-hover:rotate-45 sm:size-9" />
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <ul className="-mx-3 flex items-center gap-1 text-[0.95rem] sm:mx-0 sm:justify-end">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={navLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="inline-flex size-10 items-center justify-center rounded-full border-2 border-edge bg-paper-raised text-ink transition-transform hover:rotate-12"
          >
            <Search aria-hidden="true" className="size-[1.15rem]" />
            <span className="sr-only">Search</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
