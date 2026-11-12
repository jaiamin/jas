import { useEffect, useRef } from "react";

export function HomeLandscape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const landscape = ref.current;
    if (!landscape) return;
    let visible = false;
    const update = () => {
      landscape.dataset.active = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(landscape);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="home-landscape absolute inset-0 overflow-hidden"
      data-active="false"
    />
  );
}
