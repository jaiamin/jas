import { type CSSProperties, useEffect, useRef } from "react";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import type { EnvironmentId } from "@/lib/types";

const worlds = [
  {
    name: "resources",
    color: "oklch(0.67 0.15 155)",
    environments: ["commons", "renewable_resource"],
  },
  {
    name: "exchange",
    color: "oklch(0.62 0.19 255)",
    environments: ["trust_exchange", "information"],
  },
  {
    name: "work",
    color: "oklch(0.72 0.15 70)",
    environments: ["coordination", "institutional_workflow"],
  },
  {
    name: "rules",
    color: "oklch(0.68 0.16 305)",
    environments: ["institution", "reliance_commitments"],
  },
] satisfies {
  name: string;
  color: string;
  environments: [EnvironmentId, EnvironmentId];
}[];

const positions = [
  { x: 0, side: "west" },
  { x: 840, side: "east" },
];

export function HomeEnvironments() {
  const field = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = field.current;
    if (!svg) return;
    let visible = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateActivity = () => {
      svg.dataset.paused = String(
        !visible || document.hidden || motion.matches,
      );
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
      viewBox="0 0 1120 280"
      preserveAspectRatio="xMidYMid slice"
    >
      {worlds.map((world, index) => (
        <g
          key={world.name}
          className="home-environment-world"
          data-world={world.name}
          style={
            {
              "--primary": world.color,
              animationDelay: `${-((4 - index) % 4) * 12}s`,
            } as CSSProperties
          }
        >
          {positions.map(({ x, side }, position) => (
            <g
              key={side}
              className={`home-environment-${side}`}
              transform={`translate(${x} -32)`}
            >
              <EnvironmentMark
                environment={world.environments[position]}
                className="size-70"
                size={280}
              />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
