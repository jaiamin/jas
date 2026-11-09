import { useEffect, useMemo, useRef, useState } from "react";
import { createGridLife, type LifeCell } from "@/components/home-grid-life";

const cellSize = 18;
const tickMilliseconds = 700;

export function HomeGrid() {
  const field = useRef<SVGSVGElement>(null);
  const seed = useRef<number | null>(null);
  const [{ columns, rows }, setGrid] = useState({ columns: 60, rows: 18 });
  useEffect(() => {
    const svg = field.current;
    if (!svg) return;
    const resize = new ResizeObserver(([entry]) => {
      // Bound the decorative DOM, and fit complete cells without cropped edges.
      const columns = Math.max(
        1,
        Math.min(144, Math.floor(entry.contentRect.width / cellSize)),
      );
      const rows = Math.max(
        1,
        Math.min(24, Math.floor(entry.contentRect.height / cellSize)),
      );
      setGrid((current) =>
        current.columns === columns && current.rows === rows
          ? current
          : { columns, rows },
      );
    });
    resize.observe(svg);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const svg = field.current;
    if (!svg) return;
    seed.current ??= Math.floor(Math.random() * 4294967296);
    const world = createGridLife(columns, rows, seed.current);
    const rects = svg.querySelectorAll<SVGRectElement>(".home-grid-cell");
    let previous = new Map<number, LifeCell>();
    const paint = (cells: LifeCell[]) => {
      const next = new Map(cells.map((cell) => [cell.index, cell]));
      for (const index of previous.keys()) {
        if (!next.has(index)) rects[index].style.opacity = "0";
      }
      for (const cell of cells) {
        const before = previous.get(cell.index);
        const rect = rects[cell.index];
        if (before?.color !== cell.color)
          rect.setAttribute("fill", `var(--home-grid-${cell.color})`);
        if (before?.opacity !== cell.opacity)
          rect.style.opacity = String(cell.opacity);
      }
      previous = next;
    };
    // Resize can reuse rects. Reset once; React never renders simulation frames.
    for (const rect of rects) rect.style.opacity = "0";
    paint(world.cells());
    let timer: ReturnType<typeof setInterval> | undefined;
    let visible = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateActivity = () => {
      const paused = !visible || document.hidden || motion.matches;
      svg.dataset.paused = String(paused);
      if (paused && timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      } else if (!paused && timer === undefined) {
        timer = setInterval(() => paint(world.step()), tickMilliseconds);
      }
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    });
    visibility.observe(svg);
    document.addEventListener("visibilitychange", updateActivity);
    motion.addEventListener("change", updateActivity);
    updateActivity();
    return () => {
      clearInterval(timer);
      visibility.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      motion.removeEventListener("change", updateActivity);
    };
  }, [columns, rows]);

  const cells = useMemo(
    () =>
      Array.from({ length: columns * rows }, (_, index) => ({
        x: (index % columns) * cellSize,
        y: Math.floor(index / columns) * cellSize,
      })),
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
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          className="home-grid-cell"
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
