// "from earlier reviews" — comments whose anchor left the current diff. they're excluded
// from the compiled prompt and would otherwise be unreachable, so they're listed here for
// cleanup (resolve / edit / delete). shown inside the compile modal.
import { html } from "/preact.js";
import { partitionComments } from "/util.js";
import { SavedComment } from "/comments.js";

// human label for where an orphaned comment used to live.
function locationLabel(c) {
  if (c.line == null) return `${c.file} — File-level`;
  const kind = c.side === "old" ? "Old line" : "Line";
  const range = c.endLine != null && c.endLine !== c.line ? `${c.line}–${c.endLine}` : `${c.line}`;
  return `${c.file} — ${kind} ${range}`;
}

export function StaleComments({ comments, diff, onEdit, onDelete, onResolve }) {
  const { stale } = partitionComments(comments, diff);
  if (stale.length === 0) return null;
  return html`<section class="stale-comments">
    <div class="stale-head">
      <span class="stale-title">From earlier reviews (${stale.length})</span>
      <span class="stale-note">No longer in this diff — excluded from the prompt. Resolve or delete to clear.</span>
    </div>
    ${stale.map(
      (c) => html`<div class="stale-item" key=${c.id}>
        <div class="stale-loc">${locationLabel(c)}</div>
        <${SavedComment} comment=${c} onEdit=${onEdit} onDelete=${onDelete} onResolve=${onResolve} />
      </div>`
    )}
  </section>`;
}
