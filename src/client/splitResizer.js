// a draggable divider between the two side-by-side code panes. reports a new ratio
// (0..1) = the old/left pane's share of the code area (the bubble gutter + the two
// 46px line-number columns are excluded from the split).
import { html } from "/preact.js";

const BUBBLE = 22; // each side's bubble-gutter column
const NO_COLS = 92; // two 46px line-number columns
const FIXED = BUBBLE * 2 + NO_COLS; // non-code width (old + new bubble gutters + both number cols)
const LEAD = BUBBLE + 46; // old bubble + old line-number column, left of the left code pane

export function SplitResizer({ ratio, onRatio }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    const wrap = e.currentTarget.parentElement; // .split-wrap (position: relative)
    const move = (ev) => {
      const rect = wrap.getBoundingClientRect();
      const r = (ev.clientX - rect.left - LEAD) / (rect.width - FIXED);
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
    style=${`left: calc(${LEAD}px + (100% - ${FIXED}px) * ${ratio})`}
    title="Drag to resize the panes"
    onMouseDown=${onMouseDown}
  ></div>`;
}
