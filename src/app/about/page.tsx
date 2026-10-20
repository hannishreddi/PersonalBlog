import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rss } from "lucide-react";

import { SunMark } from "@/components/layout/sun-mark";
import { siteConfig } from "@/config/site";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.authorLabel}, the person behind this blog.`,
  alternates: canonicalAlternates("/about"),
};

/*
 * The owner's name and the blog's purpose are real. The three personal
 * sections are still waiting for the owner's own details; each is marked
 * with <ToFill>. Never invent biographical details to fill them.
 */
function ToFill({ children }: { children: string }) {
  return <em className="text-ink-muted">(To be filled in: {children})</em>;
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 sm:pt-20">
      <header>
        <p className="-rotate-2 font-hand text-2xl text-accent">nice to meet you</p>
        <h1 className="mt-2 font-serif text-5xl font-bold tracking-[-0.03em] text-ink sm:text-6xl">About me</h1>
      </header>

      <div className="sticker mt-10 flex flex-col gap-6 rounded-[2rem] bg-peach p-6 sm:flex-row sm:items-center sm:p-8">
        {/* Swap for a real portrait (with alt text) once one is available. */}
        <div className="flex size-28 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-paper-raised sm:size-32">
          <SunMark className="size-16" />
        </div>
        <div>
          <p className="font-serif text-2xl font-semibold text-ink">{siteConfig.authorLabel}</p>
          <p className="mt-2 text-ink-soft">I write the essays, reflections, and notes on this blog.</p>
        </div>
      </div>

      <div className="article-prose mt-12">
        <h2>Who I am</h2>
        <p>
          <ToFill>a short introduction in your own words.</ToFill>
        </p>

        <h2>What I&rsquo;m studying</h2>
        <p>
          <ToFill>your course or field, and where you study.</ToFill>
        </p>

        <h2>What I&rsquo;m working towards</h2>
        <p>
          <ToFill>what you hope to become or build.</ToFill>
        </p>

        <h2>What you&rsquo;ll find here</h2>
        <p>
          Essays, reflections, and notes, written slowly. Browse them by{" "}
          <Link href="/topics">topic</Link>, or start with the <Link href="/">latest writing</Link>.
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
