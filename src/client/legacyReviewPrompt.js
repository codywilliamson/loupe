import { html, useEffect, useState } from "/preact.js";
import { detectLegacyReview, importLegacyReview, removeLegacyReview } from "/api.js";

export function LegacyReviewPrompt({ reviewId, onImport }) {
  const [present, setPresent] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { detectLegacyReview().then((value) => setPresent(value.present === true)).catch(() => {}); }, []);
  if (!reviewId || !present) return null;
  const importReview = async () => {
    try { const record = await importLegacyReview(reviewId); onImport(record); setPresent(false); }
    catch (cause) { setError(String(cause)); }
  };
  const remove = async () => {
    if (!window.confirm("Remove the existing .review file? This cannot be undone.")) return;
    try { await removeLegacyReview(true); setPresent(false); }
    catch (cause) { setError(String(cause)); }
  };
  return html`<aside class="legacy-review" role="status">
    <div><strong>Existing .review found</strong><span>Import its comments, remove it, or leave it untouched.</span></div>
    <div class="legacy-actions">
      <button class="btn-primary" onClick=${importReview}>Import</button>
      <button class="btn-plain" onClick=${remove}>Remove</button>
      <button class="btn-link" onClick=${() => setPresent(false)}>Ignore</button>
    </div>
    ${error && html`<div class="review-warning">${error}</div>`}
  </aside>`;
}
