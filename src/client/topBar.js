// top bar: wordmark + update badge + ref on the left; counts, view toggles, theme + compile on the right.
import { html } from "/preact.js";
import { totalDelta } from "/util.js";
import { Sun, Moon, Refresh, Columns, File } from "/icons.js";
import { UpdateBadge } from "/update.js";

export function TopBar({
  refLabel,
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
}) {
  const { add, del } = totalDelta(files);
  return html`<header class="top-bar">
    <div class="top-left">
      <span class="wordmark">loupe</span>
      <${UpdateBadge} status=${update} />
      <span class="ref-label" title=${refLabel}>${refLabel}</span>
    </div>
    <div class="top-right">
      <span class="file-count">${files.length} file${files.length === 1 ? "" : "s"}</span>
      <span class="top-delta">
        <span class="add">+${add}</span>
        <span class="del">-${del}</span>
      </span>
      <button class="btn-icon icon-btn ${viewMode === "single" ? "on" : ""}" title="Single-file view" onClick=${onToggleView}>
        <${File} />
      </button>
      <button class="btn-icon icon-btn ${splitView ? "on" : ""}" title="Side-by-side (all files)" onClick=${onToggleSplit}>
        <${Columns} />
      </button>
      <button class="btn-icon icon-btn ${refreshing ? "spinning" : ""}" title="Re-run the diff" onClick=${onRefresh}>
        <${Refresh} />
      </button>
      <button class="btn-icon icon-btn" title="Toggle dark mode" onClick=${onToggleTheme}>
        ${theme === "dark" ? html`<${Sun} />` : html`<${Moon} />`}
      </button>
      <button class="btn-compile" onClick=${onCompile}>Compile Review Prompt</button>
    </div>
  </header>`;
}
