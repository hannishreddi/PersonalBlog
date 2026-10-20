/**
 * Tag and category name rules shared by the editor (client) and Server
 * Actions, so the preview shows exactly what will be saved.
 */

/**
 * Tag names typed into the editor's tag field. Tags are comma-separated, and
 * a part written as hashtags ("#one #two") is split at each "#" that starts a
 * word. The "#" itself is dropped: tags are always displayed with one. Names
 * like "C#" are left intact.
 */
export function splitTagNames(raw: string): string[] {
  return raw
    .split(",")
    .flatMap((part) => part.split(/(?:^|\s+)#+/))
    .map((name) => name.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Collapses whitespace and capitalises each word of an all-lowercase
 * category name ("culture & media" -> "Culture & Media"), so categories
 * read consistently. A name with any capital letter is kept as typed, which
 * preserves deliberate spellings such as "AI" or "iOS".
 */
export function normalizeCategoryName(name: string): string {
  const collapsed = name.replace(/\s+/g, " ").trim();
  if (collapsed !== collapsed.toLowerCase()) return collapsed;
  return collapsed.replace(/(^|\s)(\p{Ll})/gu, (_match, space: string, letter: string) => space + letter.toUpperCase());
}
