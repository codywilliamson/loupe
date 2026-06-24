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

// scroll every code cell on `side` to match the pane scrollbar's position.
export function syncPane(tableRef, side, scrollLeft) {
  const table = tableRef.current;
  if (!table) return;
  for (const cell of table.querySelectorAll(`td.code.${side}`)) cell.scrollLeft = scrollLeft;
}
