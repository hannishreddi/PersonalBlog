"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  // Articles and older feed pages belong to "Writing"; archives to "Topics".
  { href: "/", label: "Writing", matches: ["/page/", "/blog/"] },
  { href: "/topics", label: "Topics", matches: ["/category/", "/tag/"] },
  { href: "/about", label: "About", matches: [] },
] as const;

type NavLink = (typeof NAV_LINKS)[number];

/** "page" for the exact section page, "true" for pages inside the section. */
function currentFor(link: NavLink, pathname: string | null): "page" | "true" | undefined {
  if (pathname === null) return undefined;
  if (pathname === link.href) return "page";
  return link.matches.some((prefix) => pathname.startsWith(prefix)) ? "true" : undefined;
}

const navLinkClass =
  "rounded-full px-3 py-1.5 font-semibold text-ink transition-colors hover:bg-paper-raised hover:underline hover:decoration-orange hover:decoration-2 hover:underline-offset-4 aria-[current]:bg-paper-raised aria-[current]:underline aria-[current]:decoration-orange aria-[current]:decoration-2 aria-[current]:underline-offset-4";

function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="-mx-3 flex items-center gap-1 text-[0.95rem] sm:mx-0 sm:justify-end">
      {NAV_LINKS.map((link) => (
        <li key={link.href}>
          <Link href={link.href} aria-current={currentFor(link, pathname)} className={navLinkClass}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Main navigation links, marking the current section. */
export function MainNavLinks() {
  return <NavList pathname={usePathname()} />;
}

/**
 * The same links without a current section. Shown while the pathname is
 * unknown during prerendering (pages with params not known at build time).
 */
export function MainNavLinksFallback() {
  return <NavList pathname={null} />;
}
