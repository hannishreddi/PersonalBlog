import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-24 sm:px-8 sm:py-32">
      <p className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">404</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">
        This page has wandered off.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        The page you were looking for doesn&rsquo;t exist, or is no longer published.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-paper-raised"
      >
        Back to all writing
      </Link>
    </div>
  );
}
