// inline comment cards + the editor. file-level and line-level share the same ui.
import { html, useState, useRef, useEffect } from "/preact.js";
import { relativeTime } from "/util.js";

// auto-resizing textarea that grows with its content.
function AutoTextarea({ value, onInput, onKeyDown }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    el.focus();
  }, [value]);
  return html`<textarea
    ref=${ref}
    class="comment-input"
    value=${value}
    onInput=${(e) => onInput(e.target.value)}
    onKeyDown=${onKeyDown}
    placeholder="Leave a comment…"
  ></textarea>`;
}

// the new/edit editor card. onSave(text), onCancel().
export function CommentEditor({ initial = "", onSave, onCancel }) {
  const [text, setText] = useState(initial);
  const submit = () => {
    const trimmed = text.trim();
    if (trimmed) onSave(trimmed);
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
    if (e.key === "Escape") onCancel();
  };
  return html`<div class="comment-card editing">
    <${AutoTextarea} value=${text} onInput=${setText} onKeyDown=${onKeyDown} />
    <div class="comment-actions">
      <button class="btn-primary" onClick=${submit} disabled=${!text.trim()}>Save</button>
      <button class="btn-plain" onClick=${onCancel}>Cancel</button>
    </div>
  </div>`;
}

// a single saved comment, with inline edit + delete.
function SavedComment({ comment, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return html`<${CommentEditor}
      initial=${comment.text}
      onSave=${(text) => {
        onEdit(comment.id, text);
        setEditing(false);
      }}
      onCancel=${() => setEditing(false)}
    />`;
  }
  return html`<div class="comment-card">
    <div class="comment-meta">
      <span class="comment-time">${relativeTime(comment.createdAt)}</span>
      <span class="comment-tools">
        <button class="btn-link" onClick=${() => setEditing(true)}>Edit</button>
        <button class="btn-link" onClick=${() => onDelete(comment.id)}>Delete</button>
      </span>
    </div>
    <div class="comment-text">${comment.text}</div>
  </div>`;
}

// a stack of comments for one anchor (a line or a file). threads stack vertically.
export function CommentThread({ comments, onEdit, onDelete }) {
  return html`<div class="comment-thread">
    ${comments.map(
      (c) => html`<${SavedComment}
        key=${c.id}
        comment=${c}
        onEdit=${onEdit}
        onDelete=${onDelete}
      />`
    )}
  </div>`;
}
