import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "@/components/icons";
import { Button } from "@/components/ui/button";

const cellSize = 20;
const colors = [
  "var(--home-grid-blue)",
  "var(--home-grid-purple)",
  "var(--home-grid-red)",
];
// Fixed clusters keep the pattern stable across renders and visits. The diagonal
// phase carries the ripple; small offsets keep neighboring cells from blinking together.
const cells = Array.from({ length: 60 * 18 }, (_, index) => {
  const x = index % 60;
  const y = Math.floor(index / 60);
  const hash = (x * 73 + y * 151 + x * y * 19) % 97;
  const cluster = (Math.floor(x / 3) * 11 + Math.floor(y / 2) * 7) % 13;
  return { x, y, hash, cluster };
}).filter(({ hash, cluster }) => cluster < 5 && hash % 3 !== 0);

export function HomeGrid() {
  const id = useId();
  const field = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const svg = field.current;
    if (!svg) return;
    let visible = true;
    const update = () => {
      svg.dataset.paused = String(paused || !visible || document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(svg);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [paused]);

  return (
    <>
      <svg
        ref={field}
        aria-hidden="true"
        focusable="false"
        className="home-grid pointer-events-none absolute inset-0 size-full text-foreground"
        viewBox="0 0 1200 360"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={id}
            width={cellSize}
            height={cellSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M20 0H0V20"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="1200" height="360" fill={`url(#${id})`} />
        {cells.map(({ x, y, hash }) => (
          <rect
            key={`${x}-${y}`}
            x={x * cellSize + 0.5}
            y={y * cellSize + 0.5}
            width={cellSize - 1}
            height={cellSize - 1}
            fill={colors[Math.floor(hash / 3) % colors.length]}
            className="home-grid-cell"
            style={{
              animationDelay: `-${(x * 0.65 + y * 1.1 + (hash % 5) * 0.3) % 36}s`,
            }}
          />
        ))}
      </svg>
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-2 right-2 motion-reduce:hidden"
        aria-label={
          paused ? "Resume background animation" : "Pause background animation"
        }
        title={
          paused ? "Resume background animation" : "Pause background animation"
        }
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
    </>
  );
}
