const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** Date and time in UTC, labelled as such (server output has no reader time zone). */
export function formatDateTimeUtc(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} UTC`;
}

/** A tag as a hashtag, without doubling a "#" the owner already typed. */
export function formatTagName(name: string): string {
  return `#${name.replace(/^#+/, "")}`;
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
