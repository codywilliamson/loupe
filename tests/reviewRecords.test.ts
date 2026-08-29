import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  approveReview, cancelReview, createReviewRecord, detectLegacyReview, findActiveReview, importLegacyReview,
  markCommentAddressed, readReviewRecord, removeLegacyReview, replyToComment, requestRereview,
  returnFeedback, setCommentStatus, updateReviewRecord,
} from "../src/core/reviewRecords";

const dirs: string[] = [];
const comment = { id: "c1", file: "src/a.ts", line: 4, lineContent: "+new", text: "please fix", createdAt: "2026-01-01T00:00:00.000Z" };
function tempDir(): string { const dir = mkdtempSync(join(tmpdir(), "loupe-records-")); dirs.push(dir); return dir; }
function makeRecord(cwd = tempDir()) { return createReviewRecord({ target: { cwd, ref: "main" }, comments: [comment], viewed: ["src/a.ts"] }); }

beforeEach(() => { process.env.LOUPE_DATA_DIR = tempDir(); });
afterEach(() => { delete process.env.LOUPE_DATA_DIR; while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

describe("review records", () => {
  it("creates, reads, updates, and atomically stores a record under the user root", () => {
    const record = makeRecord();
    expect(readReviewRecord(record.id)).toEqual(record);
    const updated = updateReviewRecord(record.id, { summary: "needs work" });
    expect(updated.summary).toBe("needs work");
    const path = join(process.env.LOUPE_DATA_DIR!, "reviews", record.id, "review.json");
    expect(existsSync(path)).toBe(true); expect(readFileSync(path, "utf8")).toContain('"schemaVersion": 1');
  });

  it("rejects invalid or escaping IDs", () => {
    expect(() => readReviewRecord("../outside")).toThrow("invalid review id");
    expect(() => updateReviewRecord("a/b", {})).toThrow("invalid review id");
  });

  it("detects, imports without deleting, and explicitly removes legacy reviews", () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, ".review"), JSON.stringify({ meta: { ref: "feature", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }, viewed: ["a.ts"], comments: [{ ...comment, tag: "issue", resolved: true }] }));
    expect(detectLegacyReview(cwd)).toBe(true);
    const record = importLegacyReview("legacy-1", cwd);
    expect(existsSync(join(cwd, ".review"))).toBe(true);
    expect(record.id).toBe("legacy-1"); expect(record.viewed).toEqual(["a.ts"]);
    expect(record.comments[0]!.tag).toBe("issue"); expect(record.comments[0]!.status).toBe("resolved");
    expect(removeLegacyReview(cwd)).toBe(true); expect(detectLegacyReview(cwd)).toBe(false); expect(removeLegacyReview(cwd)).toBe(false);
  });

  it("protects terminal states while retaining readable records", () => {
    const source = makeRecord(); expect(findActiveReview(source.target.cwd)?.id).toBe(source.id);
    const approved = approveReview(source.id, true);
    expect(readReviewRecord(approved.id)?.status).toBe("approved");
    expect(findActiveReview(source.target.cwd)).toBeNull();
    expect(() => updateReviewRecord(approved.id, { summary: "late" })).toThrow("terminal");
    const cancelled = cancelReview(makeRecord().id);
    expect(readReviewRecord(cancelled.id)?.status).toBe("cancelled");
    expect(() => requestRereview(cancelled.id)).toThrow("terminal");
  });

  it("requires acknowledgement when approving unresolved comments", () => {
    const record = makeRecord();
    expect(() => approveReview(record.id)).toThrow("acknowledging unresolved");
    expect(approveReview(record.id, true).status).toBe("approved");
  });

  it("allows only reviewers to resolve and agents to address/reply", () => {
    const record = makeRecord();
    expect(() => setCommentStatus(record.id, "c1", "resolved", "agent")).toThrow("only the reviewer");
    expect(markCommentAddressed(record.id, "c1").comments[0]!.status).toBe("addressed");
    const replied = replyToComment(record.id, "c1", "fixed", "agent");
    expect(replied.comments[0]!.replies?.[0]!.author).toBe("agent");
    expect(setCommentStatus(record.id, "c1", "resolved", "reviewer").comments[0]!.resolved).toBe(true);
    expect(replyToComment(record.id, "c1", "follow-up", "agent").comments[0]!.status).toBe("resolved");
    expect(() => markCommentAddressed(record.id, "c1")).toThrow("reopened by the reviewer");
    expect(() => setCommentStatus(record.id, "c1", "open", "agent")).toThrow("only the reviewer");
  });

  it("records lifecycle activity and rereview transitions", () => {
    const record = makeRecord();
    expect(returnFeedback(record.id).status).toBe("feedback_ready");
    expect(requestRereview(record.id).status).toBe("awaiting_human");
    const types = readReviewRecord(record.id)!.activity.map((item) => item.type);
    expect(types).toEqual(expect.arrayContaining(["review_started", "feedback_returned", "rereview_requested"]));
  });

  it("requires unresolved feedback and a feedback-ready rereview", () => {
    const empty = createReviewRecord({ target: { cwd: tempDir(), ref: "main" } });
    expect(() => returnFeedback(empty.id)).toThrow("requires an unresolved comment");
    const record = makeRecord();
    expect(() => requestRereview(record.id)).toThrow("requires returned feedback");
    returnFeedback(record.id);
    expect(() => returnFeedback(record.id)).toThrow("awaiting the reviewer");
    expect(() => approveReview(record.id, true)).toThrow("awaiting the reviewer");
  });
});
