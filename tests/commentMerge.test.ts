import { describe, expect, it } from "bun:test";
import { mergeReviewerComments } from "../src/core/commentMerge";
import type { Comment } from "../src/types";

const base: Comment = {
  id: "c1", file: "src/a.ts", line: 4, lineContent: "+new", text: "please fix", createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mergeReviewerComments", () => {
  it("preserves agent replies and status through an incoming text edit", () => {
    const stored: Comment[] = [
      { ...base, status: "addressed", replies: [{ id: "r1", author: "agent", text: "done", createdAt: "2026-01-01T00:01:00.000Z" }] },
    ];
    const incoming: Comment[] = [{ ...base, text: "please fix (edited)" }];
    const merged = mergeReviewerComments(stored, incoming);
    expect(merged[0]!.text).toBe("please fix (edited)");
    expect(merged[0]!.status).toBe("addressed");
    expect(merged[0]!.replies).toEqual(stored[0]!.replies);
  });

  it("preserves a reviewer-resolved stored status", () => {
    const stored: Comment[] = [{ ...base, status: "resolved", resolved: true }];
    const incoming: Comment[] = [{ ...base, text: "updated text" }];
    const merged = mergeReviewerComments(stored, incoming);
    expect(merged[0]!.status).toBe("resolved");
    expect(merged[0]!.resolved).toBe(true);
  });

  it("passes through a new incoming comment with no stored match", () => {
    const merged = mergeReviewerComments([], [base]);
    expect(merged).toEqual([base]);
  });

  it("drops a stored comment missing from incoming", () => {
    const stored: Comment[] = [base, { ...base, id: "c2" }];
    const merged = mergeReviewerComments(stored, [base]);
    expect(merged.map((comment) => comment.id)).toEqual(["c1"]);
  });

  it("keeps incoming values when the stored copy has no status or replies", () => {
    const stored: Comment[] = [{ ...base }];
    const incoming: Comment[] = [
      { ...base, status: "addressed", replies: [{ id: "r1", author: "reviewer", text: "hi", createdAt: base.createdAt }] },
    ];
    const merged = mergeReviewerComments(stored, incoming);
    expect(merged[0]!.status).toBe("addressed");
    expect(merged[0]!.replies).toEqual(incoming[0]!.replies);
  });
});
