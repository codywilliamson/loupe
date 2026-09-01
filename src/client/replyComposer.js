// inline reply composer for a comment thread. autofocuses; Ctrl/Cmd+Enter sends, Esc cancels.
// onSend may return a promise: pending disables the buttons, rejection keeps the draft and
// shows an inline error instead of the app-wide fatal screen.
import { html, useState, useRef, useEffect } from "/preact.js";

// server errors arrive as "Error: <message>" — strip that prefix for display.
const cleanError = (e) => String(e).replace(/^Error:\s*/, "");

export function ReplyComposer({ onSend, onCancel }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    Promise.resolve(onSend(trimmed)).catch((e) => {
      setPending(false);
      setError(cleanError(e));
    });
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") onCancel();
  };

  return html`<div class="reply-composer">
    <textarea
      ref=${ref}
      class="comment-input"
      aria-label="Reply"
      value=${text}
      onInput=${(e) => setText(e.target.value)}
      onKeyDown=${onKeyDown}
      placeholder="Reply…"
    ></textarea>
    <div class="comment-actions">
      <button class="btn-primary" onClick=${submit} disabled=${!text.trim() || pending}>Send</button>
      <button class="btn-plain" onClick=${onCancel} disabled=${pending}>Cancel</button>
    </div>
    ${error && html`<div class="reply-error">${error}</div>`}
  </div>`;
}
