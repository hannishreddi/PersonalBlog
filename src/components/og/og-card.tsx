import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * Link-preview cards (1200 × 630) rendered with next/og. Satori supports
 * only flexbox and inline styles, and CSS variables aren't available, so
 * the light-theme palette from globals.css is repeated here.
 *
 * Satori can't use next/font, so the site's fonts are committed as WOFF
 * files in assets/fonts (SIL Open Font License, copies alongside) and read
 * once per server process.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const [fraunces700, bricolage400, bricolage700] = await Promise.all([
  font("fraunces-latin-700-normal.woff"),
  font("bricolage-grotesque-latin-400-normal.woff"),
  font("bricolage-grotesque-latin-700-normal.woff"),
]);

/** ImageResponse options shared by every card. */
export const OG_OPTIONS = {
  ...OG_SIZE,
  fonts: [
    { name: "Fraunces", data: fraunces700, weight: 700 as const, style: "normal" as const },
    { name: "Bricolage Grotesque", data: bricolage400, weight: 400 as const, style: "normal" as const },
    { name: "Bricolage Grotesque", data: bricolage700, weight: 700 as const, style: "normal" as const },
  ],
};

const COLORS = {
  paper: "#fff6ee",
  peach: "#ffd2af",
  orange: "#f97830",
  ink: "#2a1608",
  inkSoft: "#573521",
};

/** The header's sun mark, with literal colours. */
function Sun({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <g fill={COLORS.orange} stroke={COLORS.ink} strokeWidth="2" strokeLinejoin="round">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M20 1.5 L23 8 L17 8 Z" transform={`rotate(${i * 45} 20 20)`} />
        ))}
        <circle cx="20" cy="20" r="10" />
      </g>
      <circle cx="16.5" cy="18.5" r="1.3" fill={COLORS.ink} />
      <circle cx="23.5" cy="18.5" r="1.3" fill={COLORS.ink} />
      <path d="M16 22.5 Q20 26 24 22.5" fill="none" stroke={COLORS.ink} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Title size that keeps long titles inside the card. */
function titleSize(title: string, narrow: boolean): number {
  const length = title.length;
  if (narrow) return length > 70 ? 46 : length > 40 ? 54 : 64;
  return length > 90 ? 56 : length > 50 ? 68 : 84;
}

interface OgCardProps {
  /** Small label above the title, e.g. a category. */
  eyebrow?: string;
  title: string;
  /** The site name and, when known, its host. */
  siteName: string;
  host?: string;
  /** A data URL for an image shown beside the text. */
  image?: string;
}

export function OgCard({ eyebrow, title, siteName, host, image }: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLORS.peach,
        padding: 40,
        fontFamily: "Bricolage Grotesque",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 40,
          background: COLORS.paper,
          border: `4px solid ${COLORS.ink}`,
          borderRadius: 40,
          boxShadow: `10px 10px 0 ${COLORS.orange}`,
          padding: 48,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {eyebrow && (
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    background: COLORS.orange,
                    color: COLORS.ink,
                    border: `3px solid ${COLORS.ink}`,
                    borderRadius: 999,
                    padding: "6px 18px",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  {eyebrow}
                </div>
              </div>
            )}
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: titleSize(title, Boolean(image)),
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -2,
                color: COLORS.ink,
              }}
            >
              {title}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Sun size={56} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "Fraunces", fontSize: 32, fontWeight: 700, color: COLORS.ink }}>{siteName}</div>
              {host && <div style={{ fontSize: 22, color: COLORS.inkSoft }}>{host}</div>}
            </div>
          </div>
        </div>

        {image && (
          <div
            style={{
              width: 430,
              display: "flex",
              border: `4px solid ${COLORS.ink}`,
              borderRadius: 28,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori image, not HTML */}
            <img src={image} width={430} height={454} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>
    </div>
  );
}
