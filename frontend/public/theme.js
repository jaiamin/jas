{
  let theme;
  try {
    theme = localStorage.getItem("jas-theme");
  } catch {
    // Use the system preference when browser storage is unavailable.
  }
  if (
    theme === "dark" ||
    (!theme && window.matchMedia?.("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  }
}
