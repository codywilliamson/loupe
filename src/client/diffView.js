// right pane: each file as a collapsible section with hunks + a per-file split toggle.
import { html, useState } from "/preact.js";
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

function FileSection({ file, threads }) {
  const md = isMarkdown(file.path) && file.changeType !== "deleted";
  const [open, setOpen] = useState(true);
  const [split, setSplit] = useState(false);
  const [preview, setPreview] = useState(md); // markdown renders as a preview by default
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
      onToggleSplit=${() => setSplit(!split)}
      onTogglePreview=${() => setPreview(!preview)}
      onAddFileComment=${threads.onStartFileAdd}
    />
    ${open &&
    html`<div class="file-body">
      ${(fileComments.length > 0 || threads.addingFile) &&
      html`<div class="file-comments">
        <${CommentThread} comments=${fileComments} onEdit=${threads.onEdit} onDelete=${threads.onDelete} />
        ${threads.addingFile &&
        html`<${CommentEditor} onSave=${(t) => threads.onAddFile(t)} onCancel=${threads.onCancelAdd} />`}
      </div>`}
      ${md && preview
        ? html`<${MarkdownView} path=${file.path} />`
        : file.binary
          ? html`<div class="binary-note">Binary file — no preview</div>`
          : split
            ? html`<div class="split-wrap">
                <table class="diff-table split">
                  <colgroup>
                    <col class="cg-no" />
                    <col style=${`width: ${(ratio * 100).toFixed(2)}%`} />
                    <col class="cg-no" />
                    <col style=${`width: ${((1 - ratio) * 100).toFixed(2)}%`} />
                  </colgroup>
                  ${file.hunks.map((hunk, i) => html`<${SplitHunk} key=${i} hunk=${hunk} path=${file.path} />`)}
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

// builds the per-file `threads` controller bridging comment state to the views.
function makeThreads(file, ctx) {
  const { comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete } = ctx;
  const isThisFile = adding && adding.file === file.path;
  const fileComments = comments.filter((c) => c.file === file.path && c.line != null);
  // pending range for this file (the open editor's target), normalized to [start, end].
  const pendStart = isThisFile && adding.line != null ? adding.line : null;
  const pendEnd = pendStart != null ? (adding.endLine != null ? adding.endLine : adding.line) : null;
  // live drag-select range for this file, normalized to [lo, hi].
  const sel = selecting && selecting.file === file.path ? selecting : null;
  const selLo = sel ? Math.min(sel.from, sel.to) : null;
  const selHi = sel ? Math.max(sel.from, sel.to) : null;
  return {
    commentsForFile: () => comments.filter((c) => c.file === file.path && c.line == null),
    // a thread renders once, anchored below its END line.
    commentsForLine: (line) => fileComments.filter((c) => endOf(c) === line),
    // true if `newLine` falls inside any saved comment's range (for highlighting).
    rangeAt: (newLine) => fileComments.some((c) => newLine >= c.line && newLine <= endOf(c)),
    // true if `newLine` is inside the live drag-select or the open editor's range.
    pendingAt: (newLine) =>
      (sel != null && newLine >= selLo && newLine <= selHi) ||
      (pendStart != null && newLine >= pendStart && newLine <= pendEnd),
    // the END line of the pending range, where the editor renders.
    addingLine: pendStart != null ? pendEnd : null,
    addingFile: isThisFile && adding.line == null,
    // drag-select: highlight the range as the pointer moves, then open the editor on release.
    onSelectMove: (from, to) => setSelecting({ file: file.path, from, to }),
    onSelectCommit: (lo, hi) => {
      setAdding({ file: file.path, line: lo, endLine: hi });
      setSelecting(null);
    },
    onStartFileAdd: () => setAdding({ file: file.path, line: null }),
    onCancelAdd: () => setAdding(null),
    onAdd: (diffLine, text) => {
      const start = Math.min(adding.line, adding.endLine ?? adding.line);
      const end = Math.max(adding.line, adding.endLine ?? adding.line);
      onAdd({ file: file.path, line: start, endLine: end, lineContent: rawLine(diffLine), text });
      setAdding(null);
    },
    onAddFile: (text) => {
      onAdd({ file: file.path, line: null, lineContent: null, text });
      setAdding(null);
    },
    onEdit,
    onDelete,
  };
}

// reconstruct the raw diff line (marker + content) for the comment anchor.
function rawLine(line) {
  const sign = line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " ";
  return sign + line.content;
}

export function DiffView({ files, comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete }) {
  const ctx = { comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete };
  return html`<main class="diff-pane">
    ${files.map((file) => html`<${FileSection} key=${file.path} file=${file} threads=${makeThreads(file, ctx)} />`)}
  </main>`;
}
