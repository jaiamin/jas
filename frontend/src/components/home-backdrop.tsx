import { useEffect, useRef, useState } from "react";

export function HomeBackdrop() {
  const field = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    let visible = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateActivity = () => {
      setPlaying(visible && !document.hidden && !motion.matches);
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    });
    visibility.observe(element);
    document.addEventListener("visibilitychange", updateActivity);
    motion.addEventListener("change", updateActivity);
    return () => {
      visibility.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      motion.removeEventListener("change", updateActivity);
    };
  }, []);

  return (
    <div
      ref={field}
      aria-hidden="true"
      className="home-media pointer-events-none absolute inset-0"
      data-motion={playing ? "animated" : "still"}
    >
      <img
        src={playing ? "/illustrations/city.gif" : "/illustrations/city.webp"}
        alt=""
        width={1600}
        height={320}
        decoding="async"
        draggable={false}
        className="home-city"
      />
    </div>
  );
}
