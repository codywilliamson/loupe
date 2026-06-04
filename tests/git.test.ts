import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { collectDiff, repoName, resolveRef } from "../src/utils/git";
import { parseDiff } from "../src/core/diffParser";

function git(args: string[], cwd: string): void {
  Bun.spawnSync(["git", ...args], { cwd });
}

let repo: string;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "loupe-git-"));
  git(["init", "-q", "-b", "main"], repo);
  git(["config", "user.name", "t"], repo);
  git(["config", "user.email", "t@e.com"], repo);
  writeFileSync(join(repo, "tracked.txt"), "one\n");
  git(["add", "-A"], repo);
  git(["commit", "-q", "-m", "init"], repo);
  writeFileSync(join(repo, "tracked.txt"), "one\ntwo\n"); // modify a tracked file
  writeFileSync(join(repo, "fresh.txt"), "brand new\n"); // brand-new untracked file
});

afterAll(() => rmSync(repo, { recursive: true, force: true }));

describe("collectDiff", () => {
  it("includes untracked files as added when requested", () => {
    const files = parseDiff(collectDiff(["diff", "HEAD"], repo, true), "wt").files;
    const paths = files.map((f) => f.path);
    expect(paths).toContain("tracked.txt");
    expect(paths).toContain("fresh.txt");
    const fresh = files.find((f) => f.path === "fresh.txt");
    expect(fresh?.changeType).toBe("added");
    expect(fresh?.additions).toBe(1);
  });

  it("omits untracked files when not requested", () => {
    const paths = parseDiff(collectDiff(["diff", "HEAD"], repo, false), "wt").files.map((f) => f.path);
    expect(paths).toContain("tracked.txt");
    expect(paths).not.toContain("fresh.txt");
  });

  it("never surfaces loupe's own .review file", () => {
    writeFileSync(join(repo, ".review"), "{}\n");
    try {
      const paths = parseDiff(collectDiff(["diff", "HEAD"], repo, true), "wt").files.map((f) => f.path);
      expect(paths).toContain("fresh.txt");
      expect(paths).not.toContain(".review");
    } finally {
      rmSync(join(repo, ".review"), { force: true });
    }
  });
});

describe("repoName", () => {
  it("falls back to the folder name without an origin remote", () => {
    expect(repoName(repo)).toBe(basename(repo));
  });
});

describe("resolveRef meta", () => {
  it("default working-tree plan surfaces untracked files", () => {
    const plan = resolveRef(undefined, repo);
    expect(plan.mode).toBe("working tree");
    expect(plan.source).toBe("working tree");
    expect(plan.target).toBe("main");
    expect(plan.includeUntracked).toBe(true);
  });

  it("staged plan does not surface untracked files", () => {
    const plan = resolveRef("staged", repo);
    expect(plan.mode).toBe("staged");
    expect(plan.includeUntracked).toBe(false);
  });
});
