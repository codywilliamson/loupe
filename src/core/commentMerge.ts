// merges a reviewer's saved comments array into the stored Review Record. the incoming
// array (from the client) decides which comments exist and their reviewer-owned fields;
// agent-owned fields (replies/status/resolved) come from the stored copy when it has them,
// so a stale client save can't clobber a reply or an addressed mark the agent just wrote.
import type { Comment } from "../types";

export function mergeReviewerComments(stored: Comment[], incoming: Comment[]): Comment[] {
  const storedById = new Map(stored.map((comment) => [comment.id, comment]));
  return incoming.map((comment) => {
    const previous = storedById.get(comment.id);
    if (!previous) return comment;
    return {
      ...comment,
      replies: previous.replies ?? comment.replies,
      status: previous.status ?? comment.status,
      resolved: previous.resolved ?? comment.resolved,
    };
  });
}
