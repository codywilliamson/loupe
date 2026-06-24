# Side-by-Side: Independent Per-Pane Scroll + Wrap Toggle — Design

> Status: approved (user chose "each side as one unit"; building autonomously).
> Date: 2026-06-23

## Summary

Make side-by-side panes **resizable** (keep the existing drag-resizer) AND let each pane
**scroll horizontally as one unit** — scrolling the left pane pans all its lines together,
the right pane unaffected — with no cross-pane overlap. Plus a global **word-wrap toggle**
(off by default) that switches between scroll (off) and wrap (on).

Supersedes the reverted interim wrap fix and the synchronized-scroll attempt.

## Why this approach (single table + synthetic per-pane scrollbar)

The split view is one `<table>` (table-layout: fixed). That single table is what gives —
for free — perfect row **alignment**, full-width inline **comment rows** (colspan), and the
**resizer** (fixed % code columns). A two-pane rewrite would break all three. So we keep the
table and add per-pane horizontal scroll on top:

- Code cells clip (`overflow: hidden`) instead of overflowing — kills the cross-pane overlap.
  Their `scrollLeft` is driven programmatically (overflow:hidden still scrolls via scrollLeft).
- One **synthetic horizontal scrollbar per pane**, rendered as a sticky-bottom row *inside the
  table* so its two cells sit in the old/new code columns and auto-resize with the resizer (no
  manual positioning math). Each scrollbar cell is an `overflow-x: auto` strip whose inner
  spacer is as wide as that side's widest line.
- A small sync: scrolling a pane's scrollbar sets `scrollLeft` on every code cell of that side;
  `Shift`+wheel over a pane scrolls it too.

This isolates all new behavior to a scroll module + CSS; comments, alignment, and the resizer
keep working untouched.

## Behavior

| | Wrap OFF (default) | Wrap ON |
|---|---|---|
| **Split** | code clips; one scrollbar per pane scrolls that side as a unit; resizer active | `white-space: pre-wrap`; lines wrap in the 50/50 panes; no scrollbars; resizer active |
| **Unified** | `white-space: pre`; table scrolls (as today) | wraps within width |

## Components

### `src/client/splitScroll.js` (new)
- `useSplitScroll(tableRef, deps)` — after render (and when `deps` change), measure each side's
  widest line: `max(cell.scrollWidth)` over `.code.old` / `.code.new` cells; return `{ oldW, newW }`.
- `syncPane(tableRef, side, scrollLeft)` — set `scrollLeft` on every `.code` cell of `side`.
- The scrollbar strips call `syncPane` on their `onScroll`; a `Shift`+wheel handler on the
  split-wrap forwards horizontal intent to the matching strip.

### `src/client/diffView.js`
- Mark code cells with a side class so they're queryable: `.code.old` / `.code.new` (via
  `diffLines.js` `SplitRow`/`Side`).
- After the hunks, render a sticky scrollbar row: two `overflow-x: auto` strips in the old/new
  code columns, each containing a spacer `<div style="width: ${oldW|newW}px; height: 1px">`.
- Thread `wrap` → `.diff-pane.wrap` class; gate the scrollbar row out when wrapping (no scroll
  needed) but keep the resizer in both modes.

### `src/client/diff.css`
- `.diff-table.split .code { overflow: hidden; }` (clip; scrollLeft-driven). Keep `table-layout: fixed`.
- `.diff-pane.wrap .diff-table.split .code { overflow: visible; white-space: pre-wrap; overflow-wrap: anywhere; }`.
- `.diff-pane.wrap .code { white-space: pre-wrap; overflow-wrap: anywhere; }` (unified wrap too).
- `.hscroll-row td { position: sticky; bottom: 0; }`, `.hscroll { overflow-x: auto; height: 14px; }`,
  hide native code-cell scrollbars are N/A (overflow:hidden has none).

### Toggle (reused from the earlier wrap design)
- `app.js`: `usePersistedState("loupe-wrap", false)` + `onToggleWrap`; pass `wrap` to TopBar + DiffView; `w` shortcut.
- `topBar.js`: `WrapText` icon button (`data-tip` "Wrap lines"/"No wrap"), always visible.
- `icons.js`: `WrapText`. `shortcuts.js`: `["w", "Wrap lines"]` + handler.

## Consequences / risks

- Resizer stays in **both** modes (no-wrap fixed columns + scroll; wrap fixed 50/50).
- The synthetic scrollbar's **visual** can't be screenshot-verified on this machine (the
  capture tool times out), so it's verified by measurement (positions, spacer width, scrollLeft
  sync, no content overflow). The CSS is conservative/standard to minimize visual risk; flagged
  for the user to eyeball.
- Wrap-mode alignment is free (single table). No JS height-sync needed.

## Testing & verification

No unit tests (CSS/UI). `bun x tsc --noEmit` clean; `bun test` unaffected (green).
Browser (diff with long lines, this branch vs `main`, side-by-side):
- Wrap off: no content overflows its cell (no overlap); each side's scrollbar sets that side's
  cells' `scrollLeft` and not the other side's; resizer drags; comments still render.
- Wrap on: lines wrap; no scrollbars; resizer drags.
- Unified: off scrolls, on wraps. `w` toggles; persists; `?` lists it.

## Files touched

`src/client/splitScroll.js` (new), `src/client/diffView.js`, `src/client/diffLines.js`
(side classes on code cells), `src/client/diff.css`, `src/client/icons.js`, `src/client/app.js`,
`src/client/topBar.js`, `src/client/shortcuts.js`, `CHANGELOG.md`. No server/types changes.

## Release

Rides the pending 0.9.0 release. CHANGELOG `[Unreleased]`: Added (wrap toggle + independent
per-pane horizontal scroll in side-by-side); the overlap is fixed as part of it.
