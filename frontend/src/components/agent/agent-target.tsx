import { type ComponentProps, useEffect, useRef } from "react";
import { AgentIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Browser-managed orbits; completed and reduced-motion targets stay still. */
export function AgentTarget({
  motion = "idle",
  className,
  ...props
}: Omit<ComponentProps<typeof AgentIcon>, "children" | "ref"> & {
  motion?: "idle" | "intro" | "working";
}) {
  const icon = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const target = icon.current;
    if (motion === "idle" || !target) return;
    const orbits = target.querySelector("[data-agent-orbits]");
    const outer = target.querySelector("[data-orbit=outer]");
    const inner = target.querySelector("[data-orbit=inner]");
    if (!orbits || !outer || !inner) return;

    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let introduced = false;
    let animations: Animation[] = [];
    const settle = () => {
      for (const animation of animations) animation.cancel();
      animations = [];
      delete target.dataset.agentMotion;
    };
    const start = () => {
      target.dataset.agentMotion = "active";
      const intro = motion === "intro";
      animations = [
        outer.animate(
          [{ transform: "rotate(-90deg)" }, { transform: "rotate(270deg)" }],
          {
            duration: intro ? 2200 : 5200,
            iterations: intro ? 1 : Number.POSITIVE_INFINITY,
            easing: "linear",
          },
        ),
        inner.animate(
          [
            { transform: "rotate(-30deg)" },
            { transform: `rotate(${intro ? 210 : 330}deg)` },
          ],
          {
            duration: intro ? 2200 : 7800,
            iterations: intro ? 1 : Number.POSITIVE_INFINITY,
            easing: "linear",
          },
        ),
      ];
      if (intro) {
        const entrance = orbits.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 1, offset: 0.12 },
            { opacity: 1, offset: 0.72 },
            { opacity: 0, offset: 1 },
          ],
          { duration: 2200, easing: "ease-in-out" },
        );
        entrance.onfinish = () => {
          introduced = true;
          settle();
        };
        animations.push(entrance);
      }
    };
    const updateActivity = () => {
      if (preference.matches) {
        // Do not replay a decorative entrance after a preference change.
        introduced = true;
        settle();
        return;
      }
      if (visible && !document.hidden) {
        if (!animations.length && !(motion === "intro" && introduced)) start();
        else for (const animation of animations) animation.play();
      } else {
        for (const animation of animations) animation.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    });
    observer.observe(target);
    document.addEventListener("visibilitychange", updateActivity);
    preference.addEventListener("change", updateActivity);
    updateActivity();
    return () => {
      settle();
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      preference.removeEventListener("change", updateActivity);
    };
  }, [motion]);

  return (
    <AgentIcon
      ref={icon}
      className={cn(
        "shrink-0 text-primary",
        motion !== "idle" && "agent-target",
        className,
      )}
      data-agent-state={motion}
      {...props}
    >
      {motion !== "idle" && (
        <g data-agent-orbits="" strokeWidth="1.75">
          <circle
            data-orbit="outer"
            cx="12"
            cy="12"
            r="10"
            pathLength="100"
            strokeDasharray="24 76"
          />
          <circle
            data-orbit="inner"
            cx="12"
            cy="12"
            r="6"
            pathLength="100"
            strokeDasharray="20 80"
          />
        </g>
      )}
    </AgentIcon>
  );
}
