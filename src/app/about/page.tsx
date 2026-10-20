import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rss } from "lucide-react";

import { SunMark } from "@/components/layout/sun-mark";
import { siteConfig } from "@/config/site";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.name} and the person who writes it.`,
  alternates: canonicalAlternates("/about"),
};

/*
 * PLACEHOLDER: everything personal on this page is stand-in copy, clearly
 * labelled as such. Replace it with the owner's own words before launch;
 * never invent biographical details.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 sm:pt-20">
      <header>
        <p className="-rotate-2 font-hand text-2xl text-accent">nice to meet you</p>
        <h1 className="mt-2 font-serif text-5xl font-bold tracking-[-0.03em] text-ink sm:text-6xl">
          About this blog
        </h1>
      </header>

      <div className="sticker mt-10 flex flex-col gap-6 rounded-[2rem] bg-peach p-6 sm:flex-row sm:items-center sm:p-8">
        {/* Swap for a real portrait (with alt text) once one is available. */}
        <div className="flex size-28 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-paper-raised sm:size-32">
          <SunMark className="size-16" />
        </div>
        <div>
          <p className="font-serif text-2xl font-semibold text-ink">{siteConfig.authorLabel}</p>
          <p className="mt-2 text-ink-soft">
            A one-line introduction goes here. <span className="text-ink-muted">(Placeholder copy.)</span>
          </p>
        </div>
      </div>

      <div className="article-prose mt-12">
        <p>
          This is where the story of {siteConfig.name} will be told: why it exists, what kinds of essays,
          reflections, and notes appear here, and how often new writing tends to arrive.{" "}
          <em>(Placeholder copy: replace with your own words.)</em>
        </p>
        <h2>What you&rsquo;ll find here</h2>
        <p>
          A few sentences about the themes this blog returns to.{" "}
          <em>(Placeholder copy.)</em>
        </p>
        <h2>Say hello</h2>
        <p>
          How readers can get in touch, if at all: an email address or a social profile.{" "}
          <em>(Placeholder copy: no contact details have been added yet.)</em>
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary sticker sticker-hover">
          Read the latest
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link href="/topics" className="btn btn-secondary sticker sticker-hover">
          Browse topics
        </Link>
        <a href="/feed.xml" className="btn btn-secondary sticker sticker-hover">
          <Rss aria-hidden="true" className="size-4" />
          Subscribe via RSS
        </a>
      </div>
    </div>
  );
}
