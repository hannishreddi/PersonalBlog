import { Mail } from "lucide-react";

import { CopyLinkButton } from "@/components/article/copy-link-button";
import { getSiteUrl } from "@/lib/site-url";

const chipClass =
  "btn btn-secondary sticker sticker-hover px-4! py-2! text-[0.8125rem]!";

/**
 * Plain share links (no third-party scripts or tracking) plus copy-link.
 * Network share links need the absolute URL, so they appear only once
 * SITE_URL is configured; copy-link always works.
 */
export function ShareLinks({ path, title }: { path: string; title: string }) {
  const site = getSiteUrl();
  const url = site ? new URL(path, site).toString() : null;
  const u = url ? encodeURIComponent(url) : "";
  const t = encodeURIComponent(title);

  const targets = url
    ? [
        { label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
        { label: "Bluesky", href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}` },
        { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
      ]
    : [];

  return (
    <section aria-labelledby="share-heading" className="mt-12 flex flex-wrap items-center gap-3">
      <h2 id="share-heading" className="mr-1 font-hand text-2xl text-accent">
        pass it on →
      </h2>
      <CopyLinkButton className={chipClass} />
      {targets.map((target) => (
        <a key={target.label} href={target.href} target="_blank" rel="noopener noreferrer" className={chipClass}>
          {target.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
      {url && (
        <a href={`mailto:?subject=${t}&body=${u}`} className={chipClass}>
          <Mail aria-hidden="true" className="size-4" />
          Email
        </a>
      )}
    </section>
  );
}
