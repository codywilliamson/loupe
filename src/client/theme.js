// theme cycle: light → dark → claude → claude-dark. persists the choice, sets the css
// data-theme, and swaps the hljs stylesheet to match the variant's brightness.
const KEY = "loupe-theme";

export const THEMES = ["light", "dark", "claude", "claude-dark"];

export const THEME_LABELS = {
  light: "Light",
  dark: "Dark",
  claude: "Claude",
  "claude-dark": "Claude Dark",
};

const isDark = (theme) => theme === "dark" || theme === "claude-dark";

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
  const theme = THEMES.includes(saved) ? saved : fallback;
  applyTheme(theme);
  return theme;
}

// advances to the next theme in the cycle, persists it, and returns the new value.
export function nextTheme(current) {
  const idx = THEMES.indexOf(current);
  const theme = THEMES[(idx + 1) % THEMES.length];
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
  return theme;
}
