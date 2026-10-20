/** The publication's little orange sun. Decorative. */
export function SunMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={className}>
      <g fill="var(--orange)" stroke="var(--edge)" strokeWidth="2" strokeLinejoin="round">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M20 1.5 L23 8 L17 8 Z" transform={`rotate(${i * 45} 20 20)`} />
        ))}
        <circle cx="20" cy="20" r="10" />
      </g>
      <circle cx="16.5" cy="18.5" r="1.3" fill="var(--on-orange)" />
      <circle cx="23.5" cy="18.5" r="1.3" fill="var(--on-orange)" />
      <path d="M16 22.5 Q20 26 24 22.5" fill="none" stroke="var(--on-orange)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
