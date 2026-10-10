import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="font-serif text-xl font-medium tracking-[-0.01em] text-ink sm:text-[1.4rem]"
        >
          {siteConfig.name}
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-6 text-sm text-ink-soft">
            <li>
              <Link href="/" className="underline-offset-4 transition-colors hover:text-ink hover:underline">
                Writing
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
