import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { createHomeMap } from "@/components/home-map";

const colors = {
  blue: "oklch(0.62 0.19 255)",
  green: "oklch(0.67 0.15 155)",
  amber: "oklch(0.72 0.15 70)",
  violet: "oklch(0.68 0.16 305)",
};

export function HomeEnvironments() {
  const field = useRef<SVGSVGElement>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 4294967296));
  const map = useMemo(() => createHomeMap(seed), [seed]);
  useEffect(() => {
    const svg = field.current;
    if (!svg) return;
    let visible = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateActivity = () => {
      const paused = !visible || document.hidden || motion.matches;
      svg.dataset.paused = String(paused);
      if (paused) svg.pauseAnimations();
      else svg.unpauseAnimations();
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
      svg.pauseAnimations();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      motion.removeEventListener("change", updateActivity);
    };
  }, []);

  return (
    <svg
      ref={field}
      aria-hidden="true"
      focusable="false"
      className="home-environments pointer-events-none absolute inset-0 size-full"
      data-paused="true"
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d={map.roads} className="home-map-roads" />
      {map.agents.map((agent) => (
        <g
          key={agent.id}
          className="home-map-agent"
          data-color={agent.id % 2 ? "red" : "ink"}
        >
          <rect x={-3} y={-3} width={6} height={6} rx={1} />
          <animateMotion
            path={agent.path}
            dur={`${agent.duration}s`}
            begin={`${agent.begin}s`}
            keyPoints={agent.keyPoints}
            keyTimes={agent.keyTimes}
            calcMode="linear"
            repeatCount="indefinite"
          />
        </g>
      ))}
      {map.buildings.map((building) => (
        <g
          key={building.environment}
          className="home-map-building"
          transform={`translate(${building.x - building.size / 2} ${building.y - building.size / 2})`}
          style={{ "--primary": colors[building.tone] } as CSSProperties}
        >
          <rect
            x={8}
            y={8}
            width={building.size - 16}
            height={building.size - 16}
            fill="var(--background)"
          />
          <EnvironmentMark
            environment={building.environment}
            size={building.size}
          />
        </g>
      ))}
    </svg>
  );
}
