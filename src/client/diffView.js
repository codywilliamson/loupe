// right pane: each file as a collapsible section with hunks + a per-file split toggle.
import { html, useState } from "/preact.js";
import { changeBadge, fileAnchorId } from "/util.js";
import { ChevronRight, ChevronDown, MessageSquare } from "/icons.js";
import { UnifiedHunk, SplitHunk } from "/diffLines.js";
import { CommentThread, CommentEditor } from "/comments.js";

function FileHeader({ file, open, split, onToggleOpen, onToggleSplit, onAddFileComment }) {
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
      <button class="btn-toggle ${split ? "on" : ""}" onClick=${onToggleSplit}>
        ${split ? "Side-by-side" : "Unified"}
      </button>
    </span>
  </div>`;
}

function FileSection({ file, threads }) {
  const [open, setOpen] = useState(true);
  const [split, setSplit] = useState(false);
  const fileComments = threads.commentsForFile();
  return html`<section class="file-section" id=${fileAnchorId(file.path)}>
    <${FileHeader}
      file=${file}
      open=${open}
      split=${split}
      onToggleOpen=${() => setOpen(!open)}
      onToggleSplit=${() => setSplit(!split)}
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
      ${file.binary
        ? html`<div class="binary-note">Binary file — no preview</div>`
        : html`<table class="diff-table">
            ${file.hunks.map((hunk, i) =>
              split
                ? html`<${SplitHunk} key=${i} hunk=${hunk} path=${file.path} />`
                : html`<${UnifiedHunk} key=${i} hunk=${hunk} path=${file.path} threads=${threads} />`
            )}
          </table>`}
    </div>`}
  </section>`;
}

// builds the per-file `threads` controller bridging comment state to the views.
function makeThreads(file, ctx) {
  const { comments, adding, setAdding, onAdd, onEdit, onDelete } = ctx;
  const isThisFile = adding && adding.file === file.path;
  return {
    commentsForFile: () => comments.filter((c) => c.file === file.path && c.line == null),
    commentsForLine: (line) => comments.filter((c) => c.file === file.path && c.line === line),
    addingLine: isThisFile && adding.line != null ? adding.line : null,
    addingFile: isThisFile && adding.line == null,
    onStartAdd: (line) => setAdding({ file: file.path, line }),
    onStartFileAdd: () => setAdding({ file: file.path, line: null }),
    onCancelAdd: () => setAdding(null),
    onAdd: (diffLine, text) => {
      onAdd({ file: file.path, line: diffLine.newLine, lineContent: rawLine(diffLine), text });
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

export function DiffView({ files, comments, adding, setAdding, onAdd, onEdit, onDelete }) {
  const ctx = { comments, adding, setAdding, onAdd, onEdit, onDelete };
  return html`<main class="diff-pane">
    ${files.map((file) => html`<${FileSection} key=${file.path} file=${file} threads=${makeThreads(file, ctx)} />`)}
  </main>`;
}
