// polls the durable Review Record while a review is open, surfacing new agent
// activity as a dismissible notice without ever refetching the reviewer's own actions.
import { useCallback, useEffect, useRef, useState } from "/preact.js";
import { getReview } from "/api.js";

export const REVIEW_POLL_MS = 3000;

// activity entries new to `next` (by id) authored by the agent since `prev`.
function newAgentActivity(prev, next) {
  const seen = new Set((prev?.activity ?? []).map((item) => item.id));
  return next.activity.filter((item) => !seen.has(item.id) && item.actor === "agent");
}

function summarizeNotice(prev, next) {
  if (!prev) return null; // nothing "new" on the first fetch
  const fresh = newAgentActivity(prev, next);
  const replied = fresh.filter((item) => item.type === "comment_replied").length;
  const addressed = fresh.filter((item) => item.type === "comment_addressed").length;
  const rereview = fresh.findLast((item) => item.type === "rereview_requested");
  const reopened = prev.status === "approved" && next.status === "awaiting_human";
  if (!replied && !addressed && !rereview && !reopened) return null;
  return { replied, addressed, rereviewRequested: !!rereview, rereviewSummary: rereview?.summary, reopened };
}

// merges a freshly summarized notice into whatever notice is still on screen: counts add,
// booleans OR together, and the newest rereview summary wins (falling back to the old one).
function mergeNotice(prev, fresh) {
  if (!prev) return fresh;
  return {
    replied: prev.replied + fresh.replied,
    addressed: prev.addressed + fresh.addressed,
    rereviewRequested: prev.rereviewRequested || fresh.rereviewRequested,
    rereviewSummary: fresh.rereviewSummary ?? prev.rereviewSummary,
    reopened: prev.reopened || fresh.reopened,
  };
}

export function useReviewSync(reviewId) {
  const [record, setRecord] = useState(null);
  const [notice, setNotice] = useState(null);
  const recordRef = useRef(null);
  const generationRef = useRef(0);

  const poll = useCallback(() => {
    if (!reviewId) return;
    const generation = generationRef.current;
    getReview(reviewId)
      .then((next) => {
        // a reviewId change or unmount bumped the generation since this fetch went out —
        // ignore the response so it can't populate state for the wrong review.
        if (generation !== generationRef.current) return;
        const prev = recordRef.current;
        // ISO timestamps sort lexicographically — skip unchanged AND stale/out-of-order responses
        // (an overlapping poll and an in-flight local save both land here).
        if (prev && next.updatedAt <= prev.updatedAt) return;
        const fresh = summarizeNotice(prev, next);
        if (fresh) setNotice((current) => mergeNotice(current, fresh));
        recordRef.current = next;
        setRecord(next);
      })
      .catch(() => {}); // transient poll failure — try again next tick
  }, [reviewId]);

  useEffect(() => {
    generationRef.current += 1;
    recordRef.current = null;
    setRecord(null);
    setNotice(null);
    if (!reviewId) return;
    poll();
    const timer = setInterval(() => { if (document.visibilityState === "visible") poll(); }, REVIEW_POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      generationRef.current += 1;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reviewId, poll]);

  const dismissNotice = useCallback(() => setNotice(null), []);
  return { record, refreshRecord: poll, notice, dismissNotice };
}
