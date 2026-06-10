// top bar: wordmark + update badge + diff context on the left; counts, view toggles, theme + compile on the right.
import { html } from "/preact.js";
import { totalDelta } from "/util.js";
import { Sun, Moon, Spark, Refresh, Columns, File, HelpCircle } from "/icons.js";
import { THEMES, THEME_LABELS } from "/theme.js";
import { UpdateBadge } from "/update.js";

// the icon shown for the current theme; claude variants share the starburst.
const THEME_ICONS = { light: Sun, dark: Moon, claude: Spark, "claude-dark": Spark };

// repo + mode + "source → target" so you know exactly what you're reviewing.
function DiffInfo({ meta, refLabel }) {
  if (!meta) return html`<span class="ref-label" title=${refLabel}>${refLabel}</span>`;
  return html`<span class="diff-info">
    <span class="repo-name" title=${meta.repo}>${meta.repo}</span>
    <span class="mode-pill">${meta.mode}</span>
    <span class="ref-pair" title=${`${meta.source} → ${meta.target}`}>
      ${meta.source} <span class="arrow">→</span> ${meta.target}
    </span>
  </span>`;
}

export function TopBar({
  refLabel,
  meta,
  files,
  theme,
  refreshing,
  viewMode,
  splitView,
  update,
  onRefresh,
  onToggleTheme,
  onToggleView,
  onToggleSplit,
  onCompile,
  onHelp,
}) {
  const { add, del } = totalDelta(files);
  const viewTip = viewMode === "single" ? "All-files view" : "Single-file view";
  const splitTip = splitView ? "Unified (all files)" : "Side-by-side (all files)";
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const themeTip = `Theme: ${THEME_LABELS[theme]} — next: ${THEME_LABELS[next]}`;
  const ThemeIcon = THEME_ICONS[theme] ?? Sun;
  return html`<header class="top-bar">
    <div class="top-left">
      <span class="wordmark">loupe</span>
      <${UpdateBadge} status=${update} />
      <${DiffInfo} meta=${meta} refLabel=${refLabel} />
    </div>
    <div class="top-right">
      <span class="file-count">${files.length} file${files.length === 1 ? "" : "s"}</span>
      <span class="top-delta">
        <span class="add">+${add}</span>
        <span class="del">-${del}</span>
      </span>
      <button class="btn-icon icon-btn ${viewMode === "single" ? "on" : ""}" data-tip=${viewTip} aria-label=${viewTip} onClick=${onToggleView}>
        <${File} />
      </button>
      <button class="btn-icon icon-btn ${splitView ? "on" : ""}" data-tip=${splitTip} aria-label=${splitTip} onClick=${onToggleSplit}>
        <${Columns} />
      </button>
      <button class="btn-icon icon-btn ${refreshing ? "spinning" : ""}" data-tip="Re-run the diff" aria-label="Re-run the diff" onClick=${onRefresh}>
        <${Refresh} />
      </button>
      <button class="btn-icon icon-btn" data-tip=${themeTip} aria-label=${themeTip} onClick=${onToggleTheme}>
        <${ThemeIcon} />
      </button>
      <button class="btn-icon icon-btn" data-tip="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick=${onHelp}>
        <${HelpCircle} />
      </button>
      <button class="btn-compile" onClick=${onCompile}>Compile Review Prompt</button>
    </div>
  </header>`;
}
