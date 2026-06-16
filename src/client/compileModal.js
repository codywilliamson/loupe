// modal showing the compiled review prompt: rendered markdown by default, raw toggle, copy.
import { html, useState, useEffect, useRef, useMemo } from "/preact.js";
import { marked } from "https://esm.sh/marked@12";
import { compile } from "/api.js";
import { X, Copy } from "/icons.js";
import { StaleComments } from "/staleComments.js";

export function CompileModal({ onClose, comments, diff, onEdit, onDelete, onResolve }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState(false); // false = rendered markdown preview (default)
  const taRef = useRef(null);

  useEffect(() => {
    let alive = true;
    compile()
      .then((r) => alive && (setPrompt(r.prompt ?? ""), setLoading(false)))
      .catch(() => alive && (setPrompt("Failed to compile prompt."), setLoading(false)));
    return () => (alive = false);
  }, []);

  // pre-select the raw text whenever it's the visible view, for an easy manual-copy fallback.
  useEffect(() => {
    if (!loading && raw && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [loading, raw]);

  const rendered = useMemo(() => (loading ? "" : marked.parse(prompt)), [loading, prompt]);

  // the copy button always yields the raw markdown, regardless of which view is showing.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      taRef.current?.select();
    }
  };

  return html`<div class="modal-backdrop" onClick=${onClose}>
    <div class="modal" onClick=${(e) => e.stopPropagation()}>
      <header class="modal-head">
        <h2>Compile Review Prompt</h2>
        <div class="modal-head-tools">
          <button class="btn-toggle ${raw ? "" : "on"}" disabled=${loading} onClick=${() => setRaw((v) => !v)}>
            ${raw ? "Raw" : "Rendered"}
          </button>
          <button class="btn-icon" title="Close" onClick=${onClose}><${X} /></button>
        </div>
      </header>
      <${StaleComments} comments=${comments} diff=${diff} onEdit=${onEdit} onDelete=${onDelete} onResolve=${onResolve} />
      ${raw
        ? html`<textarea ref=${taRef} class="modal-textarea" readonly value=${loading ? "Compiling…" : prompt}></textarea>`
        : html`<div class="markdown-body modal-rendered">
            ${loading ? "Compiling…" : html`<div dangerouslySetInnerHTML=${{ __html: rendered }}></div>`}
          </div>`}
      <footer class="modal-foot">
        <button class="btn-primary" onClick=${copy} disabled=${loading}>
          <${Copy} /> ${copied ? "Copied" : "Copy as Markdown"}
        </button>
        <button class="btn-plain" onClick=${onClose}>Close</button>
      </footer>
    </div>
  </div>`;
}
