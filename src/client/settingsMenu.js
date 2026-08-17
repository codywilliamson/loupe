// settings popover in the top bar. settings live in ~/.loupe/state.json (server-side) rather
// than localStorage, which is scoped to the random port each launch picks and so never carries
// over. onChange re-fetches the diff, since the server decides what the setting hides.
import { html, useState, useEffect } from "/preact.js";
import { getState, saveState } from "/api.js";
import { Settings } from "/icons.js";

export function SettingsMenu({ onChange }) {
  const [open, setOpen] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    getState()
      .then((s) => setShowReview(s.showReviewFile === true))
      .catch(() => {});
  }, []);

  const onToggleReviewFile = () => {
    const next = !showReview;
    setShowReview(next);
    saveState({ showReviewFile: next })
      .then(onChange)
      .catch(() => setShowReview(!next));
  };

  return html`<span class="settings-wrap">
    <button
      class="btn-icon icon-btn ${open ? "on" : ""}"
      data-tip="Settings"
      aria-label="Settings"
      aria-expanded=${open}
      onClick=${() => setOpen((o) => !o)}
    >
      <${Settings} />
    </button>
    ${open &&
    html`<div class="settings-pop">
      <div class="settings-head">Settings</div>
      <label class="settings-row">
        <input type="checkbox" checked=${showReview} onChange=${onToggleReviewFile} />
        <span class="settings-text">
          Review the <code>.review</code> file
          <span class="settings-hint">
            Off, loupe hides its own comment file and adds it to <code>.git/info/exclude</code>.
          </span>
        </span>
      </label>
    </div>`}
  </span>`;
}
