import type { Category, Post } from "@/types/post";

/*
 * PLACEHOLDER CONTENT
 * -------------------
 * Every post below is fictional sample writing used to develop the layout.
 * None of it describes the site owner's real life, opinions, or experiences.
 * This file is replaced by Supabase queries in a later stage (CLAUDE.md §11).
 */

const categories = {
  essays: { slug: "essays", name: "Essays" },
  reflections: { slug: "reflections", name: "Reflections" },
  notes: { slug: "notes", name: "Notes" },
  stories: { slug: "stories", name: "Stories" },
} satisfies Record<string, Category>;

function post(
  fields: Omit<Post, "createdAt" | "updatedAt" | "coverImage" | "tags"> &
    Partial<Pick<Post, "tags" | "coverImage">>,
): Post {
  const stamp = fields.publishedAt ?? "2026-09-30T09:00:00.000Z";
  return {
    coverImage: null,
    tags: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...fields,
  };
}

export const mockPosts: Post[] = [
  post({
    id: "p-01",
    slug: "the-case-for-unfinished-notebooks",
    title: "The case for unfinished notebooks",
    excerpt:
      "A placeholder essay about half-filled pages, abandoned lists, and why incompleteness can be a kind of honesty.",
    category: categories.essays,
    tags: ["writing", "habits"],
    status: "published",
    publishedAt: "2026-10-06T08:30:00.000Z",
    contentMarkdown: `Most notebooks are never finished. They are started with a burst of intention, carried for a few weeks, and then quietly retired to a drawer with two thirds of their pages still blank.

*This is placeholder text written to demonstrate the article layout. It does not describe a real person's experience.*

## The blank pages are not a failure

A notebook records attention, not achievement. The empty pages at the back only show where the attention moved somewhere else. That is not a moral failing. It is simply how curiosity behaves.

Consider what a half-filled notebook actually contains:

- a handful of ideas that were worth writing down at the time,
- a few that still are,
- and a faithful record of what someone was thinking about, before they knew how it would turn out.

## Keeping the drawer

> An unfinished notebook is a letter to a future reader who has not yet decided to read it.

There is a temptation to tidy up, to transcribe the good parts and throw away the rest. Resist it, at least for a while. The messy version carries information the clean version cannot: the order things occurred, the crossed-out false starts, the margins.

---

The next notebook will probably be unfinished too. That seems fine.`,
  }),
  post({
    id: "p-02",
    slug: "on-walking-without-a-destination",
    title: "On walking without a destination",
    excerpt:
      "Sample reflection on aimless walks, the shape of a neighbourhood, and what happens to thinking when the feet decide the route.",
    category: categories.reflections,
    tags: ["walking", "attention"],
    status: "published",
    publishedAt: "2026-10-02T17:10:00.000Z",
    contentMarkdown: `There is a particular kind of walk that has no errand attached to it. No shop to reach, no step count to hit. Just a door, a street, and a vague intention to turn left more often than right.

*Placeholder reflection for layout testing.*

## Letting the street decide

When there is no destination, small things start to steer: a patch of sunlight on one side of the road, a sound from an alley, a staircase that looks like it might lead somewhere interesting. The route becomes a conversation with the place rather than a line drawn across it.

Thinking changes too. Problems that refused to budge at a desk loosen slightly. Not solved, exactly, but turned over, so that a different face is showing.

## A small practice

1. Leave the phone in a pocket.
2. Turn at the third interesting thing.
3. Come back a different way than you went.

That is the whole method. It is not efficient, and that is rather the point.`,
  }),
  post({
    id: "p-03",
    slug: "a-short-inventory-of-quiet-rooms",
    title: "A short inventory of quiet rooms",
    excerpt:
      "Placeholder notes cataloguing reading rooms, waiting rooms, and stairwells: the overlooked places where attention collects.",
    category: categories.notes,
    tags: ["places"],
    status: "published",
    publishedAt: "2026-09-27T07:45:00.000Z",
    contentMarkdown: `A list, started as an exercise and kept going because it was pleasant.

*Fictional sample notes.*

- **A library reading room after four o'clock.** The light goes amber and the radiators tick.
- **A station waiting room between trains.** Everyone there has temporarily agreed to do nothing.
- **A stairwell in an office building.** Concrete, echoing, and almost never used.
- **A kitchen before anyone else is awake.** The kettle is the loudest thing for miles.

Quiet rooms are not silent. They are rooms where the sounds have stopped asking for anything.`,
  }),
  post({
    id: "p-04",
    slug: "what-the-old-map-left-out",
    title: "What the old map left out",
    excerpt:
      "A short fictional story about a hand-drawn map, a missing street, and the stubbornness of memory.",
    category: categories.stories,
    tags: ["fiction", "memory"],
    status: "published",
    publishedAt: "2026-09-21T19:00:00.000Z",
    contentMarkdown: `The map had been drawn in blue ballpoint on the back of a receipt, and it was wrong in one important way: it did not include the street that the house was on.

*This is a short piece of placeholder fiction.*

The narrator of this story — an invented character — follows the map anyway. It leads past a bakery that has become a phone shop, a park that has grown a fence, and a corner where a tree used to be. Each landmark is slightly displaced, as if the whole town had shifted a few metres while nobody was looking.

## The missing street

When the map runs out, the street is still there. It simply was never drawn, because whoever made the map could not imagine anyone needing directions to it. Some places are so familiar to their mapmakers that they become invisible.

---

The receipt goes back in the coat pocket. The map is wrong, and it is also exactly right.`,
  }),
  post({
    id: "p-05",
    slug: "slow-replies",
    title: "Slow replies",
    excerpt:
      "A placeholder essay on the lost art of answering a letter a week later, and why some conversations improve with delay.",
    category: categories.essays,
    tags: ["correspondence"],
    status: "published",
    publishedAt: "2026-09-14T10:20:00.000Z",
    contentMarkdown: `Instant replies favour the first thought. Slow replies make room for the second one.

*Sample essay text for development purposes.*

## The value of a gap

A letter that arrives a week after the one it answers has been thought about. It has been carried around, half-composed during a commute, revised in the shower. It is less reactive and more considered.

Not every message deserves that treatment. But some do, and it is worth noticing which ones.

## A modest proposal

Mark a few conversations as *slow*. Reply to them on purpose, not on impulse. See whether they become better conversations.`,
  }),
  post({
    id: "p-06",
    slug: "learning-to-read-the-weather-again",
    title: "Learning to read the weather again, one cloud at a time",
    excerpt:
      "Sample reflection about looking up instead of checking a forecast, and the small pleasure of guessing right.",
    category: categories.reflections,
    tags: ["nature", "attention"],
    status: "published",
    publishedAt: "2026-09-08T06:55:00.000Z",
    contentMarkdown: `Forecasts are excellent, and that is partly the problem. With a number on a screen, there is little reason to look at the sky itself.

*Placeholder reflection.*

## A few observations worth relearning

- High, thin streaks often arrive ahead of a change.
- Towering clouds that grow through the afternoon tend to mean business.
- A ring around the moon is worth noting, even if it is not a guarantee.

None of this replaces a forecast. It just puts the sky back into the conversation.`,
  }),
  post({
    id: "p-07",
    slug: "notes-on-keeping-a-commonplace-book",
    title: "Notes on keeping a commonplace book",
    excerpt:
      "Placeholder notes on collecting quotations, fragments, and borrowed sentences in one place, and how to find them again.",
    category: categories.notes,
    tags: ["writing", "reading"],
    status: "published",
    publishedAt: "2026-08-30T12:00:00.000Z",
    contentMarkdown: `A commonplace book is a single place for the sentences that are worth keeping.

*Sample notes for layout testing.*

## A simple structure

Each entry gets a date, a source, and the passage itself. Anything more elaborate tends to collapse under its own weight.

\`\`\`text
2026-08-30 — Source title, page 112
"The passage, copied exactly."
Why it mattered: one line, no more.
\`\`\`

## Finding things again

An index at the back, updated every few weeks, is more useful than tags. It forces a small act of reflection: *what was this actually about?*`,
  }),
  post({
    id: "p-08",
    slug: "the-bus-that-never-came",
    title: "The bus that never came",
    excerpt:
      "A short fictional story set at a rural bus stop, where three strangers wait for something that may not arrive.",
    category: categories.stories,
    tags: ["fiction"],
    status: "published",
    publishedAt: "2026-08-22T16:30:00.000Z",
    contentMarkdown: `Three people were waiting at the stop when the timetable stopped making sense.

*Placeholder fiction. All characters are invented.*

The first checked the timetable every few minutes, as though it might update itself. The second read a paperback with great concentration and no visible progress. The third simply watched the road.

## An hour later

Nobody spoke for a long time. Then, almost at once, everyone did. They compared notes on where they were going and discovered that two of them were headed to the same place, and that one of them had a car parked a short walk away.

---

The bus may have come eventually. Nobody was there to see it.`,
  }),
  post({
    id: "p-09",
    slug: "in-praise-of-the-second-draft",
    title: "In praise of the second draft",
    excerpt:
      "Sample essay on revision as the place where writing actually happens, and why the first draft is only a rumour.",
    category: categories.essays,
    tags: ["writing"],
    status: "published",
    publishedAt: "2026-08-12T09:15:00.000Z",
    contentMarkdown: `The first draft is a rumour about what the piece might become. The second draft is where it starts to tell the truth.

*Placeholder essay.*

## What changes between drafts

The structure usually. The opening, almost always. The best sentence from the first draft often turns out not to belong at all.

## Permission to be bad

A first draft written with the expectation of revision can afford to be loose. It only has to exist. The work comes after.`,
  }),
  post({
    id: "p-10",
    slug: "small-rituals",
    title: "Small rituals",
    excerpt:
      "Placeholder reflection on the tiny repeated acts that give a day its shape: the first cup, the window, the list.",
    category: categories.reflections,
    tags: ["habits"],
    status: "published",
    publishedAt: "2026-07-29T07:00:00.000Z",
    contentMarkdown: `A ritual does not need to be meaningful to be useful. It only needs to be repeated.

*Sample reflection.*

Opening a window first thing. Writing three lines before reading anything. Washing the same cup at the same time. These are not profound acts, but they mark the edges of a day, and edges matter.`,
  }),
  post({
    id: "p-11",
    slug: "a-field-guide-to-margins",
    title: "A field guide to margins",
    excerpt:
      "Sample notes on marginalia: the underlines, question marks, and arguments readers leave behind in books.",
    category: categories.notes,
    tags: ["reading"],
    status: "published",
    publishedAt: "2026-07-15T14:40:00.000Z",
    contentMarkdown: `Second-hand books often arrive with a previous reader still inside them.

*Placeholder notes.*

- A single underline: agreement, or at least interest.
- A question mark: a quarrel postponed.
- An exclamation mark: a quarrel won.
- A date in pencil on the flyleaf: a small time capsule.`,
  }),
  post({
    id: "p-12",
    slug: "the-lighthouse-keepers-ledger",
    title: "The lighthouse keeper's ledger",
    excerpt:
      "A fictional story told through entries in an invented keeper's logbook, one uneventful night after another.",
    category: categories.stories,
    tags: ["fiction"],
    status: "published",
    publishedAt: "2026-06-30T21:00:00.000Z",
    contentMarkdown: `*Placeholder fiction presented as an invented logbook.*

**Night one.** Lamp lit at dusk. Wind from the west. Nothing to report.

**Night two.** Lamp lit at dusk. A single fishing boat passed close to the rocks and then thought better of it.

**Night three.** Lamp lit at dusk. Nothing to report, which is the job going well.`,
  }),

  // Non-public fixtures: these must never appear on public pages.
  post({
    id: "p-draft",
    slug: "draft-unpublished-thoughts",
    title: "[Draft] Unpublished thoughts",
    excerpt: "This draft exists only to verify that drafts stay private.",
    category: categories.essays,
    status: "draft",
    publishedAt: null,
    contentMarkdown: "Draft content that must not be publicly visible.",
  }),
  post({
    id: "p-archived",
    slug: "archived-old-announcement",
    title: "[Archived] An old announcement",
    excerpt: "This archived post exists only to verify that archived posts stay private.",
    category: categories.notes,
    status: "archived",
    publishedAt: "2026-05-01T09:00:00.000Z",
    contentMarkdown: "Archived content that must not be publicly visible.",
  }),
];
