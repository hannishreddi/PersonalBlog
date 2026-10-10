/**
 * Guest comment limits, shared by the comment form and the Server Action.
 * The database allows up to 80 / 5000 characters (check constraints); the
 * app is stricter on content.
 */
export const COMMENT_LIMITS = {
  authorName: 80,
  contentMin: 2,
  content: 4000,
  /** More links than this is treated as spam. */
  links: 3,
} as const;

/** Name of the hidden honeypot field. Humans never fill it in. */
export const COMMENT_HONEYPOT_FIELD = "website";
