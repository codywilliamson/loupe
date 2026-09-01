import { html, useEffect, useState } from "/preact.js";
import { compile, getReview, submitReviewOutcome } from "/api.js";

function unresolved(record) { return (record?.comments ?? []).filter((c) => (c.status ?? (c.resolved ? "resolved" : "open")) !== "resolved"); }
function latestAgentUpdate(record) { return record?.activity?.findLast((item) => item.type === "rereview_requested" && item.actor === "agent" && item.summary)?.summary ?? ""; }
const STATUS_LABELS = { awaiting_human: "Ready", feedback_ready: "Feedback sent", approved: "Approved", cancelled: "Cancelled" };
async function copy(text) {
  await navigator.clipboard.writeText(text);
}
function guidance(record, open) {
  if (record.status === "approved") return "Review complete. The change is approved.";
  if (record.status === "cancelled") return "Review closed without approval.";
  if (record.status === "feedback_ready") return record.origin?.agent
    ? "Return to the agent and say “continue” so it can retrieve this feedback."
    : "Paste the copied feedback into the conversation that produced this change.";
  if (!open) return "Add a line- or file-level comment to return feedback, or approve the change.";
  return record.origin?.agent
    ? `${open} unresolved comment${open === 1 ? "" : "s"}. Return Feedback makes them available to the connected agent.`
    : `${open} unresolved comment${open === 1 ? "" : "s"}. Copy for a manual workflow, or record the outcome with Return Feedback.`;
}
export function ReviewPanel({ reviewId, comments, onComments }) {
  const [record, setRecord] = useState(null); const [summary, setSummary] = useState("");
  const [error, setError] = useState(""); const [copied, setCopied] = useState("");
  const refresh = () => reviewId && getReview(reviewId).then((next) => { setRecord(next); onComments(next.comments ?? []); }).catch((e) => setError(String(e)));
  useEffect(refresh, [reviewId]);
  if (!reviewId || !record) return null;
  const live = { ...record, comments }; const open = unresolved(live).length;
  const terminal = record.status === "approved" || record.status === "cancelled"; const agentUpdate = latestAgentUpdate(record);
  const awaiting = record.status === "awaiting_human";
  const act = async (outcome) => { if (outcome === "approved" && open && !window.confirm(`There are ${open} unresolved comments. Approve anyway?`)) return; try { await submitReviewOutcome(reviewId, outcome, summary, outcome === "approved" && open > 0); setSummary(""); refresh(); } catch (e) { setError(String(e)); } };
  const copyFeedback = async (format) => { try { const value = format === "json" ? JSON.stringify({ reviewId, target: record.target, summary, comments: unresolved(live) }, null, 2) : (await compile()).prompt; await copy(value); setCopied(format); setTimeout(() => setCopied(""), 1500); } catch (e) { setError(String(e)); } };
  return html`<details class="review-panel">
    <summary>Review <span class="review-status status-${record.status}">${STATUS_LABELS[record.status]}</span></summary>
    <div class="review-popover">
      <div class="review-heading">Review outcome</div>
      <p class="review-guidance">${guidance(record, open)}</p>
      ${agentUpdate && html`<div class="agent-update"><strong>Agent update</strong><p>${agentUpdate}</p></div>`}
      <textarea class="review-summary" value=${summary} disabled=${terminal || !awaiting}
        onInput=${(e) => setSummary(e.target.value)} placeholder="Optional reviewer summary"></textarea>
      <div class="review-actions">
        <button class="btn-primary" onClick=${() => act("feedback")} disabled=${!open || !awaiting}>Return Feedback</button>
        <button class="btn-plain" onClick=${() => act("approved")} disabled=${!awaiting}>Approve</button>
        <button class="btn-plain" onClick=${() => act("cancelled")} disabled=${terminal}>Cancel</button>
      </div>
      <div class="review-exports">
        <button class="btn-link" onClick=${() => copyFeedback("json")}>${copied === "json" ? "Copied" : "Copy JSON"}</button>
        <button class="btn-link" onClick=${() => copyFeedback("md")}>${copied === "md" ? "Copied" : "Copy Markdown"}</button>
      </div>
      ${error && html`<div class="review-warning">${error}</div>`}
    </div>
  </details>`;
}
