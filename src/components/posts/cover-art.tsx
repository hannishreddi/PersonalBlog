/**
 * Decorative fallback illustration for posts without a cover image.
 * Deterministic per slug, so a post always gets the same artwork, and
 * rendered as inline SVG so it costs no network request or layout shift.
 */

const PALETTE = [
  "var(--art-orange)",
  "var(--art-ink)",
  "var(--art-cream)",
  "var(--art-tangerine)",
  "var(--art-burnt)",
] as const;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(seed: number, offset: number): string {
  return PALETTE[(seed + offset) % PALETTE.length] ?? PALETTE[0];
}

export function CoverArt({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  // Independent bits drive shape, colours, and mirroring so the
  // same shape does not always arrive in the same colours.
  const variant = h % 7;
  const colorSeed = (h >>> 8) % PALETTE.length;
  const step = 1 + ((h >>> 16) % (PALETTE.length - 1));
  const a = pick(colorSeed, 0);
  const b = pick(colorSeed, step);
  const c = pick(colorSeed, step * 2);
  const mirrored = ((h >>> 24) & 1) === 1;

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="400" height="300" fill="var(--art-ground)" />
      <g transform={mirrored ? "matrix(-1 0 0 1 400 0)" : undefined}>
        {variant === 0 && (
          // Sun over a horizon.
          <>
            <circle cx="250" cy="150" r="78" fill={a} />
            <rect y="185" width="400" height="115" fill={b} opacity="0.9" />
            <rect y="225" width="400" height="75" fill={c} opacity="0.85" />
          </>
        )}
        {variant === 1 && (
          // Nested arches.
          <>
            <path d="M60 300 A140 140 0 0 1 340 300 Z" fill={a} />
            <path d="M110 300 A90 90 0 0 1 290 300 Z" fill={b} />
            <path d="M160 300 A40 40 0 0 1 240 300 Z" fill={c} />
          </>
        )}
        {variant === 2 && (
          // A quiet grid of dots with one out of place.
          <>
            {Array.from({ length: 5 }, (_, row) =>
              Array.from({ length: 7 }, (_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={50 + col * 50}
                  cy={50 + row * 50}
                  r={row === 2 && col === 4 ? 18 : 6}
                  fill={row === 2 && col === 4 ? a : b}
                  opacity={row === 2 && col === 4 ? 1 : 0.55}
                />
              )),
            )}
          </>
        )}
        {variant === 3 && (
          // Overlapping forms.
          <>
            <circle cx="160" cy="150" r="90" fill={a} opacity="0.9" />
            <circle cx="240" cy="150" r="90" fill={b} opacity="0.75" />
            <rect x="185" y="60" width="30" height="180" rx="15" fill={c} opacity="0.8" />
          </>
        )}
        {variant === 4 && (
          // Layered waves.
          <>
          <path d="M0 170 Q100 120 200 170 T400 170 V300 H0 Z" fill={a} />
          <path d="M0 210 Q100 165 200 210 T400 210 V300 H0 Z" fill={b} />
          <path d="M0 250 Q100 210 200 250 T400 250 V300 H0 Z" fill={c} />
          <circle cx="90" cy="80" r="26" fill={c} />
        </>
      )}
        {variant === 5 && (
          // A big squiggle across a sun.
          <>
            <circle cx="290" cy="110" r="64" fill={a} />
            <path
              d="M-10 210 Q40 150 90 210 T190 210 T290 210 T390 210 T490 210"
              fill="none"
              stroke={b}
              strokeWidth="26"
              strokeLinecap="round"
            />
          </>
        )}
        {variant === 6 && (
          // A wobbly flower.
          <>
            {Array.from({ length: 6 }, (_, i) => (
              <ellipse
                key={i}
                cx="200"
                cy="95"
                rx="34"
                ry="62"
                fill={i % 2 === 0 ? a : b}
                transform={`rotate(${i * 60} 200 150)`}
              />
            ))}
            <circle cx="200" cy="150" r="34" fill={c} />
          </>
        )}
      </g>
    </svg>
  );
}
