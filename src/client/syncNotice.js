// dismissible bar for agent activity noticed by useReviewSync — quiet, not a toast.
import { html } from "/preact.js";

function plural(n, noun) { return `${n} ${noun}${n === 1 ? "" : "s"}`; }

function noticeLines(notice) {
  const lines = [];
  if (notice.reopened) lines.push("Review reopened.");
  if (notice.replied) lines.push(`Agent replied to ${plural(notice.replied, "comment")}.`);
  if (notice.addressed) lines.push(`Agent marked ${plural(notice.addressed, "comment")} addressed.`);
  if (notice.rereviewRequested) {
    lines.push(`Agent requested another review.${notice.rereviewSummary ? ` “${notice.rereviewSummary}”` : ""}`);
  }
  return lines;
}

export function SyncNotice({ notice, onRefresh, onDismiss }) {
  if (!notice) return null;
  const lines = noticeLines(notice);
  if (!lines.length) return null;
  const refreshAndDismiss = () => { onRefresh(); onDismiss(); };
  return html`<div class="sync-notice" role="status">
    <span class="sync-notice-text">${lines.join(" ")}</span>
    ${notice.rereviewRequested && html`<button class="btn-link" onClick=${refreshAndDismiss}>Refresh diff</button>`}
    <button class="sync-notice-close" aria-label="Dismiss" onClick=${onDismiss}>×</button>
  </div>`;
}
