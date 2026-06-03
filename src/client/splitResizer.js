// a draggable divider between the two side-by-side code panes. reports a new ratio
// (0..1) = the old/left pane's share of the code area (the two 46px line-number
// columns are excluded from the split).
import { html } from "/preact.js";

const NO_COLS = 92; // two 46px line-number columns

export function SplitResizer({ ratio, onRatio }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    const wrap = e.currentTarget.parentElement; // .split-wrap (position: relative)
    const move = (ev) => {
      const rect = wrap.getBoundingClientRect();
      const r = (ev.clientX - rect.left - NO_COLS / 2) / (rect.width - NO_COLS);
      onRatio(Math.max(0.15, Math.min(0.85, r)));
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.body.classList.remove("resizing");
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    document.body.classList.add("resizing");
  };
  return html`<div
    class="split-resizer"
    style=${`left: calc(46px + (100% - ${NO_COLS}px) * ${ratio})`}
    title="Drag to resize the panes"
    onMouseDown=${onMouseDown}
  ></div>`;
}
