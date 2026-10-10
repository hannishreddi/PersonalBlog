import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-serif text-base text-ink-soft">{siteConfig.name}</span>
          <span aria-hidden="true"> · </span>
          {siteConfig.tagline}
        </p>
        <p>Sample content: every post shown is a fictional placeholder.</p>
      </div>
    </footer>
  );
}
