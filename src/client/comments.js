// inline comment cards + the editor. file-level and line-level share the same ui.
import { html, useState, useRef, useEffect } from "/preact.js";
import { relativeTime } from "/util.js";
import { ReplyComposer } from "/replyComposer.js";

// stored author -> reader-facing label.
const replyAuthorLabel = (author) => (author === "agent" ? "Agent" : "You");

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

export const TAGS = ["nit", "issue", "question", "praise"];

// optional tag row; clicking the active tag clears it.
function TagPicker({ tag, onTag }) {
  return html`<div class="tag-picker">
    ${TAGS.map(
      (t) => html`<button
        key=${t}
        class="tag-pill tag-${t} ${tag === t ? "on" : ""}"
        onClick=${() => onTag(tag === t ? undefined : t)}
      >${t}</button>`
    )}
  </div>`;
}

// the new/edit editor card. onSave(text, tag), onCancel().
export function CommentEditor({ initial = "", initialTag, onSave, onCancel }) {
  const [text, setText] = useState(initial);
  const [tag, setTag] = useState(initialTag);
  const submit = () => {
    const trimmed = text.trim();
    if (trimmed) onSave(trimmed, tag);
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
      <${TagPicker} tag=${tag} onTag=${setTag} />
    </div>
  </div>`;
}

// a single saved comment, with inline edit, resolve/reopen, delete, and reviewer replies.
export function SavedComment({ comment, onEdit, onDelete, onResolve, onReply }) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const replyButtonRef = useRef(null);
  const closeReplying = () => {
    setReplying(false);
    replyButtonRef.current?.focus();
  };
  if (editing) {
    return html`<${CommentEditor}
      initial=${comment.text}
      initialTag=${comment.tag}
      onSave=${(text, tag) => {
        onEdit(comment.id, text, tag);
        setEditing(false);
      }}
      onCancel=${() => setEditing(false)}
    />`;
  }
  const status = comment.status ?? (comment.resolved ? "resolved" : "open");
  const resolved = status === "resolved";
  return html`<div class="comment-card ${resolved ? "resolved" : ""} status-${status}">
    <div class="comment-meta">
      <span class="comment-time">
        ${resolved && html`<span class="resolved-badge">Resolved</span>`}
        ${status === "addressed" && html`<span class="resolved-badge">Addressed</span>`}
        ${comment.tag && html`<span class="tag-pill tag-${comment.tag} on">${comment.tag}</span>`}
        ${relativeTime(comment.createdAt)}
      </span>
      <span class="comment-tools">
        <button class="btn-link" onClick=${() => onResolve(comment.id)}>${resolved ? "Reopen" : "Resolve"}</button>
        ${!resolved && html`<button class="btn-link" onClick=${() => setEditing(true)}>Edit</button>`}
        ${onReply && !resolved && html`<button class="btn-link" ref=${replyButtonRef} onClick=${() => setReplying(true)}>Reply</button>`}
        <button class="btn-link" onClick=${() => onDelete(comment.id)}>Delete</button>
      </span>
    </div>
    <div class="comment-text">${comment.text}</div>
    ${comment.replies?.length > 0 && html`<div class="comment-replies">
      ${comment.replies.map((reply) => html`<div class="comment-reply reply-${reply.author}" key=${reply.id}>
        <span class="reply-meta">
          <span class="reply-author">${replyAuthorLabel(reply.author)}</span>
          <span class="reply-time">${relativeTime(reply.createdAt)}</span>
        </span>
        <span class="reply-text">${reply.text}</span>
      </div>`)}
    </div>`}
    ${replying && !resolved &&
    html`<${ReplyComposer}
      onSend=${(text) => onReply(comment.id, text).then(closeReplying)}
      onCancel=${closeReplying}
    />`}
  </div>`;
}

// a stack of comments for one anchor (a line or a file). threads stack vertically.
export function CommentThread({ comments, onEdit, onDelete, onResolve, onReply }) {
  return html`<div class="comment-thread">
    ${comments.map(
      (c) => html`<${SavedComment}
        key=${c.id}
        comment=${c}
        onEdit=${onEdit}
        onDelete=${onDelete}
        onResolve=${onResolve}
        onReply=${onReply}
      />`
    )}
  </div>`;
}
