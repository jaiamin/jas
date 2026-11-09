import { useEffect, useMemo, useRef, useState } from "react";

const cellSize = 20;
const colors = [
  "var(--home-grid-blue)",
  "var(--home-grid-purple)",
  "var(--home-grid-red)",
];

export function HomeGrid() {
  const field = useRef<SVGSVGElement>(null);
  const [{ columns, rows }, setGrid] = useState({ columns: 60, rows: 18 });
  useEffect(() => {
    const svg = field.current;
    if (!svg) return;
    let visible = true;
    const updateVisibility = () => {
      svg.dataset.paused = String(!visible || document.hidden);
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateVisibility();
    });
    const resize = new ResizeObserver(([entry]) => {
      const columns = Math.max(
        1,
        Math.floor(entry.contentRect.width / cellSize),
      );
      const rows = Math.max(1, Math.floor(entry.contentRect.height / cellSize));
      setGrid((current) =>
        current.columns === columns && current.rows === rows
          ? current
          : { columns, rows },
      );
    });
    visibility.observe(svg);
    resize.observe(svg);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => {
      visibility.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  // Fit complete rows and columns to the backdrop instead of cropping a fixed
  // illustration. Fixed coordinate clusters keep the ripple stable on resize.
  const cells = useMemo(
    () =>
      Array.from({ length: columns * rows }, (_, index) => {
        const x = index % columns;
        const y = Math.floor(index / columns);
        const hash = (x * 73 + y * 151 + x * y * 19) % 97;
        const cluster = (Math.floor(x / 3) * 11 + Math.floor(y / 2) * 7) % 13;
        return { x, y, hash, cluster };
      }).filter(({ hash, cluster }) => cluster < 5 && hash % 3 !== 0),
    [columns, rows],
  );

  return (
    <svg
      ref={field}
      aria-hidden="true"
      focusable="false"
      className="home-grid pointer-events-none absolute inset-0 size-full text-foreground"
      viewBox={`0 0 ${columns * cellSize} ${rows * cellSize}`}
      preserveAspectRatio="none"
    >
      {cells.map(({ x, y, hash }) => (
        <rect
          key={`${x}-${y}`}
          x={x * cellSize}
          y={y * cellSize}
          width={cellSize}
          height={cellSize}
          fill={colors[Math.floor(hash / 3) % colors.length]}
          className="home-grid-cell"
          style={{
            animationDelay: `-${(x * 0.65 + y * 1.1 + (hash % 5) * 0.3) % 36}s`,
          }}
        />
      ))}
      <path
        d={[
          ...Array.from(
            { length: columns - 1 },
            (_, index) => `M${(index + 1) * cellSize} 0V${rows * cellSize}`,
          ),
          ...Array.from(
            { length: rows - 1 },
            (_, index) => `M0 ${(index + 1) * cellSize}H${columns * cellSize}`,
          ),
        ].join(" ")}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="0.6"
      />
    </svg>
  );
}
