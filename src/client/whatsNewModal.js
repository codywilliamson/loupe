// "what's new" highlights: the auto-pop trigger hook + the modal. mirrors update.js's
// hook+component shape. content comes from whatsNew.js; the version comes from /api/update.
import { html, useState, useEffect } from "/preact.js";
import { usePersistedState } from "/prefs.js";
import { WHATS_NEW, whatsNewFor, shouldAutoShow } from "/whatsNew.js";
import { X } from "/icons.js";

// owns the seen-version + open state. auto-opens once per new version; reopen() is manual.
export function useWhatsNew(current) {
  const [seen, setSeen] = usePersistedState("loupe-seen-version", "");
  const [open, setOpen] = useState(false);
  // running version's entry, else the newest, so the manual button always has content.
  const entry = (current && whatsNewFor(current)) || WHATS_NEW[0] || null;
  useEffect(() => {
    if (shouldAutoShow(current, seen)) setOpen(true);
  }, [current, seen]);
  const close = () => {
    setOpen(false);
    if (current) setSeen(current);
  };
  return { entry, open, close, reopen: () => setOpen(true) };
}

export function WhatsNewModal({ entry, onClose }) {
  if (!entry) return null;
  return html`<div class="modal-backdrop" onClick=${onClose}>
    <div class="modal whatsnew-modal" onClick=${(e) => e.stopPropagation()}>
      <header class="modal-head">
        <h2>What's new in loupe ${entry.version}</h2>
        <button class="btn-icon" title="Close" onClick=${onClose}><${X} /></button>
      </header>
      <div class="whatsnew-body">
        ${entry.date && html`<div class="whatsnew-date">${entry.date}</div>`}
        <ul class="whatsnew-list">
          ${entry.items.map(
            (item) => html`<li class="whatsnew-item" key=${item.title}>
              <span class="whatsnew-item-title">${item.title}</span>
              <span class="whatsnew-item-body">${item.body}</span>
            </li>`
          )}
        </ul>
      </div>
      <footer class="modal-foot">
        <button class="btn-primary" onClick=${onClose}>Got it</button>
      </footer>
    </div>
  </div>`;
}
