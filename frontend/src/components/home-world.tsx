import { useEffect, useRef } from "react";
import { createPixelEarth } from "./pixel-earth";

export function HomeWorld() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const field = canvas?.parentElement;
    const divider = field?.querySelector('[data-slot="separator"]');
    const context = canvas?.getContext("2d");
    if (!canvas || !field || !divider || !context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let offset = 0;
    let timer: number | undefined;
    let scene: ReturnType<typeof createPixelEarth> | undefined;

    const paint = () => {
      if (scene) context.putImageData(scene(offset), 0, 0);
    };

    const draw = () => {
      const bounds = field.getBoundingClientRect();
      const width = bounds.width;
      const height = divider.getBoundingClientRect().top - bounds.top;
      if (width <= 0 || height <= 0) return;
      // Scale complete source pixels to the field, without gutters or cropped cells.
      canvas.width = Math.max(1, Math.round(width / 5));
      canvas.height = Math.max(1, Math.round(height / 5));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scene = createPixelEarth(
        canvas.width,
        canvas.height,
        document.documentElement.classList.contains("dark"),
      );
      paint();
    };
    const updateActivity = () => {
      window.clearInterval(timer);
      const active = visible && !document.hidden && !reduced.matches;
      canvas.dataset.active = String(active);
      if (active) {
        timer = window.setInterval(() => {
          offset += 0.12;
          paint();
        }, 160);
      }
    };
    const size = new ResizeObserver(draw);
    size.observe(field);
    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateActivity();
    });
    view.observe(canvas);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    document.addEventListener("visibilitychange", updateActivity);
    reduced.addEventListener("change", updateActivity);
    draw();
    return () => {
      window.clearInterval(timer);
      size.disconnect();
      view.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      reduced.removeEventListener("change", updateActivity);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="home-world absolute top-0 left-0"
      data-active="false"
    />
  );
}
