import type { Nodes, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

/*
 * Heading anchors and the article table of contents.
 *
 * `remarkHeadingIds` gives every heading a stable id while the article
 * renders; `extractHeadings` runs the same plugin over the same parse to list
 * them, so table-of-contents links always match the rendered ids.
 */

export interface ArticleHeading {
  id: string;
  text: string;
  /** Rendered level: Markdown h1 and h2 both render as h2 (see ArticleBody). */
  level: 2 | 3;
}

/** Ids already used by the article page, which headings must not reuse. */
const RESERVED_IDS = ["main", "responses-heading", "comments-heading", "related-heading", "toc-heading", "share-heading"];

function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "section";
}

function toText(node: Nodes): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if ("children" in node) return node.children.map(toText).join("");
  return "";
}

function walk(node: Nodes, visit: (node: Nodes) => void): void {
  visit(node);
  if ("children" in node) for (const child of node.children) walk(child, visit);
}

/** Remark plugin: adds a unique, URL-safe `id` to every heading. */
export function remarkHeadingIds() {
  return (tree: Root) => {
    const used = new Set(RESERVED_IDS);
    walk(tree, (node) => {
      if (node.type !== "heading") return;
      const base = slugify(toText(node));
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
    });
  };
}

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkHeadingIds);

/** Top-level sections (h1–h3 in Markdown) for the table of contents. */
export function extractHeadings(markdown: string): ArticleHeading[] {
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  const headings: ArticleHeading[] = [];
  walk(tree, (node) => {
    if (node.type !== "heading" || node.depth > 3) return;
    const id = node.data?.hProperties?.id;
    const text = toText(node).trim();
    if (typeof id === "string" && text) headings.push({ id, text, level: node.depth === 3 ? 3 : 2 });
  });
  return headings;
}
