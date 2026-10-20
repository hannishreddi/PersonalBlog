import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-24 sm:px-8 sm:py-32">
      <p className="font-hand text-3xl text-accent -rotate-2">oops! 404</p>
      <h1 className="mt-4 font-serif text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
        This page has wandered off.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        The page you were looking for doesn&rsquo;t exist, or is no longer published.
      </p>
      <Link
        href="/"
        className="btn btn-primary sticker sticker-hover mt-8"
      >
        Back to all writing
      </Link>
    </div>
  );
}
