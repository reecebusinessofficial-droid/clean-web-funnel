/** Symmetrical gold laurel accent for testimonials header */
export function LaurelWreath({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="laurel-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>
      <path
        d="M60 42 C48 38 38 30 32 20 C28 12 30 6 36 4"
        stroke="url(#laurel-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M54 36 C46 32 40 24 36 16 M50 28 C44 24 40 18 38 12 M46 20 C42 16 40 10 40 6"
        stroke="url(#laurel-gold)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.75"
      />
      <ellipse cx="34" cy="14" rx="4" ry="7" transform="rotate(-42 34 14)" fill="url(#laurel-gold)" opacity="0.9" />
      <ellipse cx="40" cy="8" rx="3.5" ry="6.5" transform="rotate(-28 40 8)" fill="url(#laurel-gold)" opacity="0.85" />
      <ellipse cx="48" cy="4" rx="3" ry="5.5" transform="rotate(-12 48 4)" fill="url(#laurel-gold)" opacity="0.8" />
      <ellipse cx="28" cy="22" rx="4" ry="7" transform="rotate(-55 28 22)" fill="url(#laurel-gold)" opacity="0.85" />
      <ellipse cx="32" cy="32" rx="3.5" ry="6.5" transform="rotate(-48 32 32)" fill="url(#laurel-gold)" opacity="0.75" />
      <g transform="translate(120 0) scale(-1 1)">
        <path
          d="M60 42 C48 38 38 30 32 20 C28 12 30 6 36 4"
          stroke="url(#laurel-gold)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M54 36 C46 32 40 24 36 16 M50 28 C44 24 40 18 38 12 M46 20 C42 16 40 10 40 6"
          stroke="url(#laurel-gold)"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.75"
        />
        <ellipse cx="34" cy="14" rx="4" ry="7" transform="rotate(-42 34 14)" fill="url(#laurel-gold)" opacity="0.9" />
        <ellipse cx="40" cy="8" rx="3.5" ry="6.5" transform="rotate(-28 40 8)" fill="url(#laurel-gold)" opacity="0.85" />
        <ellipse cx="48" cy="4" rx="3" ry="5.5" transform="rotate(-12 48 4)" fill="url(#laurel-gold)" opacity="0.8" />
        <ellipse cx="28" cy="22" rx="4" ry="7" transform="rotate(-55 28 22)" fill="url(#laurel-gold)" opacity="0.85" />
        <ellipse cx="32" cy="32" rx="3.5" ry="6.5" transform="rotate(-48 32 32)" fill="url(#laurel-gold)" opacity="0.75" />
      </g>
    </svg>
  );
}
