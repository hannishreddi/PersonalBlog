const WORDS_PER_MINUTE = 225;

/** Strips the most common Markdown syntax so it is not counted as words. */
function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "") // block markers
    .replace(/[*_~]/g, ""); // emphasis markers
}

/** Estimated reading time in whole minutes, never less than one. */
export function estimateReadingTime(markdown: string): number {
  const words = markdownToPlainText(markdown).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
