import { useEffect } from "react";

/** Keep focus decoration for keyboard navigation, including portalled controls. */
export function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const pointer = () => {
      root.dataset.inputModality = "pointer";
    };
    const keyboard = (event: KeyboardEvent) => {
      const editing =
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea") ||
          event.target.isContentEditable);
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        (event.key === "Tab" || !editing)
      ) {
        root.dataset.inputModality = "keyboard";
      }
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      delete root.dataset.inputModality;
    };
  }, []);
}
