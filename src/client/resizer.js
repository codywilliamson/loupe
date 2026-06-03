// a draggable vertical splitter. reports the pointer x while dragging so the
// caller can resize the pane to its left.
import { html } from "/preact.js";

export function Resizer({ onResize }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    const move = (ev) => onResize(ev.clientX);
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.body.classList.remove("resizing");
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    document.body.classList.add("resizing");
  };
  return html`<div class="resizer" onMouseDown=${onMouseDown} title="Drag to resize"></div>`;
}
