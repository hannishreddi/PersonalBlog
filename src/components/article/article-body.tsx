import Image from "next/image";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { adminMediaUrl, parseMediaUrl } from "@/lib/images";

/*
 * Renders stored article Markdown.
 *
 * Safety: react-markdown does not render raw HTML (no rehype-raw), so HTML
 * in the source is escaped, and its default `urlTransform` drops unsafe URL
 * schemes such as `javascript:`. Do not add rehype-raw without also adding
 * a sanitizer (CLAUDE.md §6–7).
 *
 * Uploaded images (`/media/<path>`) carry their dimensions in the path, so
 * they render with reserved space. On public pages they go through
 * next/image; in the owner's preview they load from the owner-only
 * /admin/images route with a plain <img>, bypassing the shared optimizer
 * cache so draft images never reach it.
 */

/** Article column width (42rem) at a 16px root size. */
const ARTICLE_IMAGE_SIZES = "(min-width: 672px) 672px, 100vw";

function isExternal(href: string | undefined): boolean {
  return !!href && /^https?:\/\//i.test(href);
}

function components(preview: boolean): Components {
  return {
    // Article headings start at h2; the page title is the only h1.
    h1: ({ node: _node, ...props }) => <h2 {...props} />,
    a: ({ node: _node, href, ...props }) =>
      isExternal(href) ? (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
      ) : (
        <a href={href} {...props} />
      ),
    img: ({ node: _node, alt, src, title }) => {
      const uploaded = parseMediaUrl(typeof src === "string" ? src : undefined);
      if (uploaded && !preview) {
        return (
          <Image
            src={src as string}
            alt={alt ?? ""}
            title={title}
            width={uploaded.width}
            height={uploaded.height}
            sizes={ARTICLE_IMAGE_SIZES}
          />
        );
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uploaded ? adminMediaUrl(uploaded.path) : (src as string | undefined)}
          alt={alt ?? ""}
          title={title}
          width={uploaded?.width}
          height={uploaded?.height}
          loading="lazy"
          decoding="async"
        />
      );
    },
  };
}

const publicComponents = components(false);
const previewComponents = components(true);

export function ArticleBody({ markdown, preview = false }: { markdown: string; preview?: boolean }) {
  return (
    <div className="article-prose">
      <Markdown remarkPlugins={[remarkGfm]} components={preview ? previewComponents : publicComponents}>
        {markdown}
      </Markdown>
    </div>
  );
}
