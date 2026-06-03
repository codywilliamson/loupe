// dark/light theme: persists the choice, sets the css data-theme, and swaps the hljs stylesheet.
const KEY = "loupe-theme";

// applies a theme to the document and toggles the matching highlight.js stylesheet.
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = document.getElementById("hljs-light");
  const dark = document.getElementById("hljs-dark");
  if (light) light.disabled = theme === "dark";
  if (dark) dark.disabled = theme !== "dark";
}

// resolves the initial theme: saved choice, else the OS preference.
export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const theme = saved ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(theme);
  return theme;
}

// flips the theme, persists it, and returns the new value.
export function nextTheme(current) {
  const theme = current === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
  return theme;
}
