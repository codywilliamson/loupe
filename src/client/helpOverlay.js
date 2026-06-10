// keyboard-shortcut reference, opened with "?" or the top-bar help button.
import { html } from "/preact.js";
import { SHORTCUTS } from "/shortcuts.js";
import { X } from "/icons.js";

export function HelpOverlay({ onClose }) {
  return html`<div class="modal-backdrop" onClick=${onClose}>
    <div class="modal help-modal" onClick=${(e) => e.stopPropagation()}>
      <header class="modal-head">
        <h2>Keyboard shortcuts</h2>
        <button class="btn-icon" title="Close" onClick=${onClose}><${X} /></button>
      </header>
      <div class="help-grid">
        ${SHORTCUTS.map(
          ([key, what]) => html`<div class="help-row" key=${key}>
            <kbd>${key}</kbd>
            <span>${what}</span>
          </div>`
        )}
      </div>
    </div>
  </div>`;
}
