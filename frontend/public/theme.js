try {
  const theme = localStorage.getItem("jas-theme");
  if (
    theme === "dark" ||
    (!theme && matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  }
} catch {
  // The interface works when browser storage is unavailable.
}
