// builds the per-file `threads` controller bridging comment state to the views.
// every anchor is a (side, line) pair so old-side and new-side lines never collide.
// ctx props are pre-scoped to this file: fileComments is already filtered, adding/selecting
// are already null unless they target this file.

// inclusive end of a comment's range; falls back to its start line.
function endOf(c) {
  return c.endLine != null ? c.endLine : c.line;
}

// comments carry a side ("old" = removed lines, "new" = added/context); default is "new".
const sideOf = (c) => c.side ?? "new";

export function makeThreads(file, ctx) {
  const { fileComments, adding, selecting, setAdding, setSelecting, onAdd, onEdit, onDelete, onResolve } = ctx;
  const isThisFile = adding != null;
  const lineComments = fileComments.filter((c) => c.line != null);
  // pending range (the open editor's target) on its side, normalized to [start, end].
  const pendSide = isThisFile && adding.line != null ? sideOf(adding) : null;
  const pendStart = pendSide != null ? adding.line : null;
  const pendEnd = pendStart != null ? (adding.endLine != null ? adding.endLine : adding.line) : null;
  // live drag-select range on its side, normalized to [lo, hi].
  const sel = selecting;
  const selSide = sel ? sideOf(sel) : null;
  const selLo = sel ? Math.min(sel.from, sel.to) : null;
  const selHi = sel ? Math.max(sel.from, sel.to) : null;
  return {
    commentsForFile: () => fileComments.filter((c) => c.line == null),
    // a thread renders once, anchored below its END line on its side.
    commentsForLine: (side, line) => lineComments.filter((c) => sideOf(c) === side && endOf(c) === line),
    // true if (side, line) falls inside any saved comment's range (for highlighting).
    rangeAt: (side, line) => lineComments.some((c) => sideOf(c) === side && line >= c.line && line <= endOf(c)),
    // true if (side, line) is inside the live drag-select or the open editor's range.
    pendingAt: (side, line) =>
      (sel != null && selSide === side && line >= selLo && line <= selHi) ||
      (pendStart != null && pendSide === side && line >= pendStart && line <= pendEnd),
    // true at the END line of the pending range on `side`, where the editor renders.
    isAddingAt: (side, line) => pendStart != null && pendSide === side && pendEnd === line,
    addingFile: isThisFile && adding.line == null,
    // drag-select: highlight the range as the pointer moves, then open the editor on release.
    onSelectMove: (side, from, to) => setSelecting({ file: file.path, side, from, to }),
    onSelectCommit: (side, lo, hi) => {
      setAdding({ file: file.path, side, line: lo, endLine: hi });
      setSelecting(null);
    },
    // shift-click extends the open comment's range (same side) to span its anchor and the new line.
    onExtendAdd: (side, line) => {
      if (pendStart == null || pendSide !== side) return setAdding({ file: file.path, side, line, endLine: line });
      setAdding({ file: file.path, side, line: Math.min(pendStart, line), endLine: Math.max(pendEnd, line) });
    },
    onStartFileAdd: () => setAdding({ file: file.path, line: null }),
    onCancelAdd: () => setAdding(null),
    onAdd: (side, diffLine, text, tag) => {
      const start = Math.min(adding.line, adding.endLine ?? adding.line);
      const end = Math.max(adding.line, adding.endLine ?? adding.line);
      onAdd({ file: file.path, side, line: start, endLine: end, lineContent: rawLine(diffLine), text, tag });
      setAdding(null);
    },
    onAddFile: (text, tag) => {
      onAdd({ file: file.path, line: null, lineContent: null, text, tag });
      setAdding(null);
    },
    onEdit,
    onDelete,
    onResolve,
  };
}

// reconstruct the raw diff line (marker + content) for the comment anchor.
function rawLine(line) {
  const sign = line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " ";
  return sign + line.content;
}
