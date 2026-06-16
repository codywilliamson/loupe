// right pane: each file as a collapsible section with hunks + a per-file split toggle.
import { html, useState, useRef } from "/preact.js";
import { changeBadge, fileAnchorId, isMarkdown } from "/util.js";
import { ChevronRight, ChevronDown, MessageSquare } from "/icons.js";
import { UnifiedHunk, SplitHunk } from "/diffLines.js";
import { CommentThread, CommentEditor } from "/comments.js";
import { MarkdownView } from "/markdownView.js";
import { SplitResizer } from "/splitResizer.js";

function FileHeader({ file, open, split, md, preview, onToggleOpen, onToggleSplit, onTogglePreview, onAddFileComment }) {
  const title = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;
  return html`<div class="file-head">
    <button class="file-collapse" onClick=${onToggleOpen}>
      ${open ? html`<${ChevronDown} />` : html`<${ChevronRight} />`}
    </button>
    <span class="badge badge-${file.changeType}">${changeBadge(file.changeType)}</span>
    <span class="file-path" title=${title}>${title}</span>
    <span class="file-delta"><span class="add">+${file.additions}</span> <span class="del">-${file.deletions}</span></span>
    <span class="file-tools">
      <button class="btn-plain" title="Add file comment" onClick=${onAddFileComment}><${MessageSquare} /></button>
      ${md &&
      html`<button class="btn-toggle ${preview ? "on" : ""}" onClick=${onTogglePreview}>${preview ? "Preview" : "Diff"}</button>`}
      ${(!md || !preview) &&
      html`<button class="btn-toggle ${split ? "on" : ""}" onClick=${onToggleSplit}>${split ? "Side-by-side" : "Unified"}</button>`}
    </span>
  </div>`;
}

function FileSection({ file, splitView, threads }) {
  const md = isMarkdown(file.path) && file.changeType !== "deleted";
  const [open, setOpen] = useState(true);
  // split follows the global toggle; a per-file toggle overrides it until the next global flip.
  // derived from the prop each render (no effect) so a global flip always takes — never gets stuck.
  const [override, setOverride] = useState(null);
  const lastGlobal = useRef(splitView);
  const globalFlipped = lastGlobal.current !== splitView;
  if (globalFlipped) {
    lastGlobal.current = splitView;
    if (override !== null) setOverride(null);
  }
  const split = globalFlipped ? splitView : override ?? splitView;
  const [preview, setPreview] = useState(false); // show the diff first; the Preview toggle renders markdown
  const [ratio, setRatio] = useState(0.5); // side-by-side pane split (left pane's share)
  const fileComments = threads.commentsForFile();
  return html`<section class="file-section" id=${fileAnchorId(file.path)}>
    <${FileHeader}
      file=${file}
      open=${open}
      split=${split}
      md=${md}
      preview=${preview}
      onToggleOpen=${() => setOpen(!open)}
      onToggleSplit=${() => setOverride(!split)}
      onTogglePreview=${() => setPreview(!preview)}
      onAddFileComment=${threads.onStartFileAdd}
    />
    ${open &&
    html`<div class="file-body">
      ${(fileComments.length > 0 || threads.addingFile) &&
      html`<div class="file-comments">
        <${CommentThread} comments=${fileComments} onEdit=${threads.onEdit} onDelete=${threads.onDelete} onResolve=${threads.onResolve} />
        ${threads.addingFile &&
        html`<${CommentEditor} onSave=${(t, tag) => threads.onAddFile(t, tag)} onCancel=${threads.onCancelAdd} />`}
      </div>`}
      ${md && preview
        ? html`<${MarkdownView} path=${file.path} />`
        : file.binary
          ? html`<div class="binary-note">Binary file — no preview</div>`
          : split
            ? html`<div class="split-wrap">
                <table class="diff-table split">
                  <colgroup>
                    <col class="cg-bubble" />
                    <col class="cg-no" />
                    <col style=${`width: ${(ratio * 100).toFixed(2)}%`} />
                    <col class="cg-bubble" />
                    <col class="cg-no" />
                    <col style=${`width: ${((1 - ratio) * 100).toFixed(2)}%`} />
                  </colgroup>
                  ${file.hunks.map((hunk, i) => html`<${SplitHunk} key=${i} hunk=${hunk} path=${file.path} threads=${threads} />`)}
                </table>
                <${SplitResizer} ratio=${ratio} onRatio=${setRatio} />
              </div>`
            : html`<table class="diff-table">
                ${file.hunks.map((hunk, i) => html`<${UnifiedHunk} key=${i} hunk=${hunk} path=${file.path} threads=${threads} />`)}
              </table>`}
    </div>`}
  </section>`;
}

// inclusive end of a comment's range; falls back to its start line.
function endOf(c) {
  return c.endLine != null ? c.endLine : c.line;
}

// comments carry a side ("old" = removed lines, "new" = added/context); default is "new".
const sideOf = (c) => c.side ?? "new";

// builds the per-file `threads` controller bridging comment state to the views.
// every anchor is a (side, line) pair so old-side and new-side lines never collide.
function makeThreads(file, ctx) {
  const { comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete, onResolve } = ctx;
  const isThisFile = adding && adding.file === file.path;
  const lineComments = comments.filter((c) => c.file === file.path && c.line != null);
  // pending range (the open editor's target) on its side, normalized to [start, end].
  const pendSide = isThisFile && adding.line != null ? sideOf(adding) : null;
  const pendStart = pendSide != null ? adding.line : null;
  const pendEnd = pendStart != null ? (adding.endLine != null ? adding.endLine : adding.line) : null;
  // live drag-select range on its side, normalized to [lo, hi].
  const sel = selecting && selecting.file === file.path ? selecting : null;
  const selSide = sel ? sideOf(sel) : null;
  const selLo = sel ? Math.min(sel.from, sel.to) : null;
  const selHi = sel ? Math.max(sel.from, sel.to) : null;
  return {
    commentsForFile: () => comments.filter((c) => c.file === file.path && c.line == null),
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

export function DiffView({ files, viewMode, activeFile, splitView, comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete, onResolve }) {
  const ctx = { comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete, onResolve };
  // single-file view shows just the active file (first file as a fallback); all-files shows the stack.
  const shown = viewMode === "single" ? [files.find((f) => f.path === activeFile) ?? files[0]].filter(Boolean) : files;
  return html`<main class="diff-pane">
    ${shown.map(
      (file) => html`<${FileSection} key=${file.path} file=${file} splitView=${splitView} threads=${makeThreads(file, ctx)} />`
    )}
  </main>`;
}
