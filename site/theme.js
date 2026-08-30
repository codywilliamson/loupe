/* Persistent light/dark preference shared with the review app. */
(() => {
  const key = "loupe-theme";
  const system = matchMedia("(prefers-color-scheme: light)");
  const readSavedTheme = () => {
    const saved = localStorage.getItem(key);
    if (saved === "claude") return "light";
    if (saved === "claude-dark") return "dark";
    return saved === "light" || saved === "dark" ? saved : null;
  };
  const getTheme = () => readSavedTheme() || (system.matches ? "light" : "dark");
  const setTheme = (theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    if (persist) localStorage.setItem(key, theme);
    const button = document.querySelector(".theme-btn");
    if (button) {
      button.textContent = theme === "dark" ? "light mode" : "dark mode";
      button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    }
  };
  setTheme(getTheme());
  addEventListener("DOMContentLoaded", () => {
    setTheme(getTheme());
    const button = document.querySelector(".theme-btn");
    if (button) button.addEventListener("click", () => setTheme(getTheme() === "dark" ? "light" : "dark", true));
    if (!readSavedTheme()) system.addEventListener("change", () => setTheme(getTheme()));
  });
})();
