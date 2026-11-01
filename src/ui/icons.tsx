const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "size-7" } as const;

export const SnowflakeIcon = () => (
  <svg {...base}>
    <path d="M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />
  </svg>
);

export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const FlameIcon = () => (
  <svg {...base}>
    <path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.6-3.6-7.4-.5 1.3-1.2 2.2-2.2 2.9.3-3.6-1.2-6.5-3.7-8.5C9.5 7 5 9.6 5 15c0 4.2 3 7 7 7Z" />
  </svg>
);

/** `count` droplets (1–3) for low / medium / high humidity. */
export const DropsIcon = ({ count }: { count: 1 | 2 | 3 }) => (
  <span className="flex gap-0.5" aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <svg key={i} {...base} className="size-5">
        <path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5Z" />
      </svg>
    ))}
  </span>
);
