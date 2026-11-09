import { useEffect, useRef } from "react";
import { AgentIcon } from "@/components/icons";

export function AgentWelcomeHeading() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = heading.current;
    if (!element) return;
    const target = element.querySelector("svg");
    if (!target) return;
    const arc = target.querySelector("[data-target-scan]");
    const ring = target.querySelector("circle:nth-child(2)");
    const center = target.querySelector("circle:nth-child(3)");
    if (!arc || !ring || !center) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let active = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animations: Animation[] = [];
    const settle = () => {
      clearTimeout(timer);
      for (const animation of animations) animation.cancel();
      animations = [];
    };
    const scan = () => {
      settle();
      // Native animation timelines do the frame work; JS only schedules a scan.
      animations = [
        arc.animate(
          [
            { opacity: 0, strokeDashoffset: "0", offset: 0 },
            { opacity: 1, strokeDashoffset: "0", offset: 0.06 },
            { opacity: 1, strokeDashoffset: "-100", offset: 0.68 },
            { opacity: 0, strokeDashoffset: "-100", offset: 0.8 },
            { opacity: 0, strokeDashoffset: "-100", offset: 1 },
          ],
          { duration: 1800, easing: "linear" },
        ),
        ring.animate(
          [
            { transform: "scale(1)", opacity: 0.75, offset: 0 },
            {
              transform: "scale(1)",
              opacity: 0.75,
              offset: 0.55,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            },
            {
              transform: "scale(0.88)",
              opacity: 1,
              offset: 0.72,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            },
            { transform: "scale(1)", opacity: 0.75, offset: 1 },
          ],
          { duration: 2000, easing: "linear" },
        ),
        center.animate(
          [
            { fillOpacity: 0, offset: 0 },
            { fillOpacity: 0, offset: 0.64 },
            { fillOpacity: 1, offset: 0.78 },
            { fillOpacity: 0, offset: 1 },
          ],
          { duration: 2000, easing: "ease-in-out" },
        ),
      ];
      timer = setTimeout(scan, 4400 + Math.random() * 2000);
    };
    const updateActivity = () => {
      const next = visible && !document.hidden && !motion.matches;
      if (active === next) return;
      active = next;
      if (active) scan();
      else settle();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", updateActivity);
    motion.addEventListener("change", updateActivity);
    return () => {
      settle();
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      motion.removeEventListener("change", updateActivity);
    };
  }, []);

  return (
    <h1
      ref={heading}
      className="flex items-center justify-center gap-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
    >
      <AgentIcon
        aria-hidden="true"
        className="agent-heading-target size-7.5 shrink-0 sm:size-8.5"
      >
        <circle
          data-target-scan=""
          cx="12"
          cy="12"
          r="10"
          pathLength="100"
          strokeDasharray="18 82"
        />
      </AgentIcon>
      <span>What can we explore?</span>
    </h1>
  );
}
