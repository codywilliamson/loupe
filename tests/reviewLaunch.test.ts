import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Comment, ReviewRecord } from "../src/types";
import { launchReview } from "../src/core/reviewLaunch";
import { readReviewRecord } from "../src/core/reviewRecords";

const git = (args: string[], cwd: string) => Bun.spawnSync(["git", ...args], { cwd });
const root = join(import.meta.dir, "..");
let repo: string;
let data: string;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "loupe-launch-repo-")); data = mkdtempSync(join(tmpdir(), "loupe-launch-data-"));
  process.env.LOUPE_DATA_DIR = data; git(["init", "-q", "-b", "main"], repo);
  git(["config", "user.name", "t"], repo); git(["config", "user.email", "t@e.com"], repo);
  writeFileSync(join(repo, "a.ts"), "const a = 1;\n"); git(["add", "-A"], repo); git(["commit", "-q", "-m", "init"], repo);
  writeFileSync(join(repo, "a.ts"), "const a = 2;\n");
});
afterAll(() => { delete process.env.LOUPE_DATA_DIR; rmSync(repo, { recursive: true, force: true }); rmSync(data, { recursive: true, force: true }); });

describe("review launch", () => {
  it("launches a durable browser review without writing legacy .review", async () => {
    const launch = launchReview({ cwd: repo, loupeRoot: root, open: false, policy: "handoff" });
    try {
      expect(launch.url).toContain(`review=${launch.review.id}`);
      const review = await fetch(`${launch.url.split("/?")[0]}/api/review`).then((res) => res.json()) as ReviewRecord;
      expect(review.id).toBe(launch.review.id);
      const comment: Comment = { id: "c1", file: "a.ts", line: 1, lineContent: "+const a = 2;", text: "why?", createdAt: new Date().toISOString() };
      const saved = await fetch(`${launch.url.split("/?")[0]}/api/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comments: [comment] }) });
      expect(saved.status).toBe(200); expect(readReviewRecord(review.id)?.comments).toHaveLength(1);
      expect(existsSync(join(repo, ".review"))).toBe(false);
      const compiled = await fetch(`${launch.url.split("/?")[0]}/api/compile`).then((res) => res.json()) as { prompt: string };
      expect(compiled.prompt).toContain("why?");
    } finally { launch.server.stop(true); }
  });
});
