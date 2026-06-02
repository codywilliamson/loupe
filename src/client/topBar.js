// top bar: wordmark + ref on the left; file count, aggregate delta, compile button on the right.
import { html } from "/preact.js";
import { totalDelta } from "/util.js";

export function TopBar({ refLabel, files, onCompile }) {
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
      <button class="btn-compile" onClick=${onCompile}>Compile Review Prompt</button>
    </div>
  </header>`;
}
