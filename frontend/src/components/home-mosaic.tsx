import { useEffect, useRef } from "react";

const PITCH = 9;
const PIXEL = 4;
const TONES = [0.12, 0.2, 0.28, 0.36, 0.44];

export function HomeMosaic() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const field = canvas?.parentElement;
    const divider = field?.querySelector('[data-slot="separator"]');
    const context = canvas?.getContext("2d");
    if (!canvas || !field || !divider || !context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let phase = 0;
    let timer: number | undefined;

    const draw = () => {
      const bounds = field.getBoundingClientRect();
      const width = Math.floor(bounds.width);
      const height = Math.floor(
        divider.getBoundingClientRect().top - bounds.top,
      );
      if (width <= 0 || height <= 0) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = getComputedStyle(canvas).color;
      const columns = Math.floor((width + PITCH - PIXEL) / PITCH);
      const rows = Math.floor((height + PITCH - PIXEL) / PITCH);
      // Center whole cells inside the divider, including after responsive resizing.
      const left = Math.floor((width - (columns * PITCH - PITCH + PIXEL)) / 2);
      const top = Math.floor((height - (rows * PITCH - PITCH + PIXEL)) / 2);
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = left + column * PITCH;
          const y = top + row * PITCH;
          const shape =
            Math.sin(x * 0.026 + Math.sin(y * 0.035) * 1.5 + phase) +
            Math.cos(y * 0.045 - x * 0.008 - phase * 0.7) +
            Math.sin(x * 0.01 - y * 0.015 + phase * 0.6);
          const tone = Math.min(
            TONES.length - 1,
            Math.floor(((shape + 3) / 6) * TONES.length),
          );
          context.globalAlpha = TONES[tone];
          context.fillRect(x, y, PIXEL, PIXEL);
        }
      }
    };
    const updateActivity = () => {
      window.clearInterval(timer);
      const active = visible && !document.hidden && !reduced.matches;
      canvas.dataset.active = String(active);
      if (active) {
        timer = window.setInterval(() => {
          phase += 0.08;
          draw();
        }, 1800);
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
      className="home-mosaic absolute top-0 left-0"
      data-active="false"
    />
  );
}
