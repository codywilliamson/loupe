// per-pane horizontal scroll for side-by-side. each side's code cells are overflow:hidden and
// driven from one synthetic scrollbar per pane, so scrolling a pane pans all its lines together
// while the single table keeps row alignment, inline comments, and the resizer working.
import { useState, useEffect } from "/preact.js";

// widest rendered line per side (max scrollWidth of that side's code cells) — sizes the
// scrollbar spacer so each pane's scroll range matches its longest line.
export function usePaneWidths(tableRef, deps) {
  const [widths, setWidths] = useState({ old: 0, new: 0 });
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const widest = (side) => {
      let max = 0;
      for (const cell of table.querySelectorAll(`td.code.${side}`)) max = Math.max(max, cell.scrollWidth);
      return max;
    };
    setWidths({ old: widest("old"), new: widest("new") });
  }, deps);
  return widths;
}

// shift every line on `side` by the scrollbar's position — as one unit. a single CSS
// variable on the table translates all lines uniformly (no per-line clamping), so the whole
// pane moves together instead of each line scrolling on its own.
export function setPaneShift(tableRef, side, scrollLeft) {
  const table = tableRef.current;
  if (table) table.style.setProperty(`--sx-${side}`, `${-scrollLeft}px`);
}

// shift+wheel (or a dominant horizontal trackpad swipe) over a pane scrolls that side
// horizontally via its scrollbar; falls through to vertical page scroll at the pane's edge.
export function useShiftScroll(tableRef) {
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const onWheel = (e) => {
      const delta = e.shiftKey ? e.deltaY : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (!delta) return;
      const cell = e.target.closest?.("td.code.old, td.code.new");
      if (!cell) return;
      const bar = table.querySelector(cell.classList.contains("old") ? ".hscroll-old" : ".hscroll-new");
      if (!bar) return;
      const before = bar.scrollLeft;
      bar.scrollLeft += delta;
      if (bar.scrollLeft !== before) e.preventDefault(); // only when we actually scrolled
    };
    table.addEventListener("wheel", onWheel, { passive: false });
    return () => table.removeEventListener("wheel", onWheel);
  }, [tableRef]);
}
