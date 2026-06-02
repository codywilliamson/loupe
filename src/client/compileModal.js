// modal showing the compiled review prompt in a pre-selected monospace textarea + copy.
import { html, useState, useEffect, useRef } from "/preact.js";
import { compile } from "/api.js";
import { X, Copy } from "/icons.js";

export function CompileModal({ onClose }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    let alive = true;
    compile()
      .then((r) => alive && (setPrompt(r.prompt ?? ""), setLoading(false)))
      .catch(() => alive && (setPrompt("Failed to compile prompt."), setLoading(false)));
    return () => (alive = false);
  }, []);

  // pre-select the text once it loads for easy manual copy.
  useEffect(() => {
    if (!loading && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [loading]);

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
        <button class="btn-icon" title="Close" onClick=${onClose}><${X} /></button>
      </header>
      <textarea
        ref=${taRef}
        class="modal-textarea"
        readonly
        value=${loading ? "Compiling…" : prompt}
      ></textarea>
      <footer class="modal-foot">
        <button class="btn-primary" onClick=${copy} disabled=${loading}>
          <${Copy} /> ${copied ? "Copied" : "Copy"}
        </button>
        <button class="btn-plain" onClick=${onClose}>Close</button>
      </footer>
    </div>
  </div>`;
}
