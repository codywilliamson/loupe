// top bar: wordmark + ref on the left; file count, aggregate delta, theme + compile on the right.
import { html } from "/preact.js";
import { totalDelta } from "/util.js";
import { Sun, Moon, Refresh } from "/icons.js";

export function TopBar({ refLabel, files, theme, refreshing, onRefresh, onToggleTheme, onCompile }) {
  const { add, del } = totalDelta(files);
  return html`<header class="top-bar">
    <div class="top-left">
      <span class="wordmark">loupe</span>
      <span class="ref-label" title=${refLabel}>${refLabel}</span>
    </div>
    <div class="top-right">
      <span class="file-count">${files.length} file${files.length === 1 ? "" : "s"}</span>
      <span class="top-delta">
        <span class="add">+${add}</span>
        <span class="del">-${del}</span>
      </span>
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
