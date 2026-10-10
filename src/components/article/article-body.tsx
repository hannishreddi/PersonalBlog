import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * Renders stored article Markdown.
 *
 * Safety: react-markdown does not render raw HTML (no rehype-raw), so HTML
 * in the source is escaped, and its default `urlTransform` drops unsafe URL
 * schemes such as `javascript:`. Do not add rehype-raw without also adding
 * a sanitizer (CLAUDE.md §6–7).
 */

function isExternal(href: string | undefined): boolean {
  return !!href && /^https?:\/\//i.test(href);
}

const components: Components = {
  // Article headings start at h2; the page title is the only h1.
  h1: ({ node: _node, ...props }) => <h2 {...props} />,
  a: ({ node: _node, href, ...props }) =>
    isExternal(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
    ) : (
      <a href={href} {...props} />
    ),
  img: ({ node: _node, alt, ...props }) => (
    // Inline images will move to next/image once uploads store dimensions.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} loading="lazy" decoding="async" {...props} />
  ),
};

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="article-prose">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
