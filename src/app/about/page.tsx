import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, GraduationCap, MapPin, Rss } from "lucide-react";

import { SunMark } from "@/components/layout/sun-mark";
import { siteConfig } from "@/config/site";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About",
  description: `${siteConfig.authorLabel}, a student from Hyderabad studying AI & Data Science engineering, and how to get in touch.`,
  alternates: canonicalAlternates("/about"),
};

/*
 * Everything personal here was supplied by the owner (October 2026). Don't
 * add biographical details beyond these without asking.
 */
const CONTACTS = [
  { label: "Email", handle: "hannishanumulla@gmail.com", href: "mailto:hannishanumulla@gmail.com" },
  { label: "Instagram", handle: "@hannish_reddi", href: "https://www.instagram.com/hannish_reddi/" },
  { label: "GitHub", handle: "hannishreddi", href: "https://github.com/hannishreddi" },
] as const;

const factClass =
  "inline-flex items-center gap-1.5 rounded-full border-2 border-edge bg-paper-raised px-3 py-1 text-sm font-semibold text-ink";

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
          <p className="mt-2 text-ink-soft">Student, writer of slow essays, and the person behind this blog.</p>
          <ul aria-label="Quick facts" className="mt-4 flex flex-wrap gap-2">
            <li className={factClass}>
              <MapPin aria-hidden="true" className="size-4 text-accent" />
              Hyderabad, India
            </li>
            <li className={factClass}>
              <GraduationCap aria-hidden="true" className="size-4 text-accent" />
              AI &amp; Data Science engineering
            </li>
          </ul>
        </div>
      </div>

      <div className="article-prose mt-12">
        <h2>Who I am</h2>
        <p>
          Hi, I&rsquo;m Hannish, a student from Hyderabad. This blog is where I slow down and write
          things out properly: essays, reflections, and notes on whatever I&rsquo;ve been thinking about.
        </p>

        <h2>What I&rsquo;m studying</h2>
        <p>
          I&rsquo;m studying engineering in Artificial Intelligence and Data Science (AI&nbsp;&amp;&nbsp;DS):
          the ideas and tools behind systems that learn from data.
        </p>

        <h2>What I&rsquo;m working towards</h2>
        <p>
          A future in technology. I&rsquo;m building towards it one step at a time, and some of what I
          learn along the way will find its way into these pages.
        </p>

        <h2>What you&rsquo;ll find here</h2>
        <p>
          Essays, reflections, and notes, written slowly. Browse them by <Link href="/topics">topic</Link>,
          or start with the <Link href="/">latest writing</Link>.
        </p>
      </div>

      <section aria-labelledby="contact-heading" className="mt-14">
        <h2 id="contact-heading" className="font-serif text-[1.75rem] font-semibold text-ink">
          Say hello
        </h2>
        <p className="mt-2 text-ink-soft">Thoughts on something I wrote, or just want to talk? Reach me here.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {CONTACTS.map((contact) => (
            <li key={contact.label}>
              <a
                href={contact.href}
                className="group sticker sticker-hover flex h-full flex-col gap-1 rounded-2xl bg-paper-raised px-4 py-3"
              >
                <span className="inline-flex items-center gap-1 text-xs font-bold tracking-[0.14em] text-accent uppercase">
                  {contact.label}
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </span>
                <span className="font-semibold break-words text-ink decoration-orange decoration-2 underline-offset-4 group-hover:underline">
                  {/* Long handles (the email) may wrap before the "@", never mid-word. */}
                  {contact.handle.split(/(?=@)/).map((part, i) => (
                    <span key={part}>
                      {i > 0 && <wbr />}
                      {part}
                    </span>
                  ))}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

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
