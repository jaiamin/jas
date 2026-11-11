import { type CSSProperties, useEffect, useRef, useState } from "react";
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
  const [map] = useState(() =>
    createHomeMap(Math.floor(Math.random() * 4294967296)),
  );
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
      <path d={map.streets} className="home-map-curb" />
      <path d={map.streets} className="home-map-street" />
      <path d={map.drives} className="home-map-drive" />
      <path d={map.streets} className="home-map-centerline" />
      <g className="home-map-crossings">
        {map.crossings.map(({ x, y }) => (
          <path
            key={`${x}-${y}`}
            d={`M${x - 3} ${y - 5}h6m-6 3h6m-6 4h6m-6 3h6`}
          />
        ))}
      </g>
      <g className="home-map-gardens">
        {[
          [202, 42],
          [444, 58],
          [708, 62],
          [1192, 52],
          [1342, 216],
          [76, 330],
        ].map(([x, y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path className="home-map-lawn" d="M-17-12H8L19-1V15H-17Z" />
            <circle cx={-6} cy={-2} r={6} />
            <circle cx={7} cy={5} r={5} />
            <path className="home-map-bench" d="M-10 12h10m-8-2v4m6-4v4" />
          </g>
        ))}
      </g>
      {map.agents.map((agent) => (
        <g
          key={agent.id}
          className="home-map-agent"
          data-color={agent.id % 2 ? "red" : "ink"}
        >
          <rect x={-4} y={-2.5} width={8} height={5} rx={1.8} />
          <path d="M1-1v2" className="home-map-agent-face" />
          <animateMotion
            path={agent.path}
            dur={`${agent.duration}s`}
            begin={`${agent.begin}s`}
            keyPoints={agent.keyPoints}
            keyTimes={agent.keyTimes}
            calcMode="linear"
            rotate="auto"
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
            x={4}
            y={4}
            width={building.size - 8}
            height={building.size - 8}
            fill="var(--background)"
          />
          <g
            transform={
              building.street < building.y
                ? `translate(0 ${building.size}) scale(1 -1)`
                : undefined
            }
          >
            <path
              className="home-map-plot"
              d={`M${building.size / 2 - 7} ${building.size - 5}H5V15L15 5H${building.size - 5}V${building.size - 15}L${building.size - 15} ${building.size - 5}H${building.size / 2 + 7}`}
            />
            <path
              className="home-map-door"
              d={`M${building.size / 2 - 5} ${building.size - 5}h10m-10-3h10`}
            />
            <path
              className="home-map-paving"
              d={`M${building.size / 2 - 5} ${building.size - 1}v-18h10v18`}
            />
          </g>
          <EnvironmentMark
            environment={building.environment}
            size={building.size}
          />
        </g>
      ))}
    </svg>
  );
}
