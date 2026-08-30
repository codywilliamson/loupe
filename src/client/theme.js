// Two themes only. Legacy Claude values are migrated at read time so saved preferences survive.
const KEY = "loupe-theme";

export const THEMES = ["light", "dark"];

export const THEME_LABELS = {
  light: "Light",
  dark: "Dark",
};

const LEGACY_THEMES = { claude: "light", "claude-dark": "dark" };
const isDark = (theme) => theme === "dark";

// applies a theme to the document and toggles the matching highlight.js stylesheet.
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = document.getElementById("hljs-light");
  const dark = document.getElementById("hljs-dark");
  if (light) light.disabled = isDark(theme);
  if (dark) dark.disabled = !isDark(theme);
}

// resolves the initial theme: saved choice, else the OS preference.
export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const fallback = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = THEMES.includes(saved) ? saved : LEGACY_THEMES[saved] ?? fallback;
  if (saved && LEGACY_THEMES[saved]) localStorage.setItem(KEY, theme);
  applyTheme(theme);
  return theme;
}

// advances between the two themes, persists it, and returns the new value.
export function nextTheme(current) {
  const idx = THEMES.indexOf(current);
  const theme = THEMES[(idx + 1) % THEMES.length];
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
  return theme;
}
