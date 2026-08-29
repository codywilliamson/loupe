import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findActiveReview } from "../src/core/reviewRecords";

const dirs: string[] = [];
const temp = (name: string) => { const dir = mkdtempSync(join(tmpdir(), name)); dirs.push(dir); return dir; };
const git = (args: string[], cwd: string) => Bun.spawnSync(["git", ...args], { cwd });
afterEach(() => { delete process.env.LOUPE_DATA_DIR; while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

describe("completion hook", () => {
  test("creates one required review and deduplicates later stops", () => {
    const repo = temp("loupe-hook-repo-"); const data = temp("loupe-hook-data-"); process.env.LOUPE_DATA_DIR = data;
    git(["init", "-q", "-b", "main"], repo); git(["config", "user.name", "t"], repo); git(["config", "user.email", "t@e.com"], repo);
    writeFileSync(join(repo, "a.ts"), "one\n"); git(["add", "-A"], repo); git(["commit", "-q", "-m", "init"], repo); writeFileSync(join(repo, "a.ts"), "two\n");
    const env = { ...process.env, LOUPE_DATA_DIR: data, LOUPE_HOOK_NO_SPAWN: "1" } as Record<string, string>;
    const run = () => Bun.spawnSync(["bun", join(import.meta.dir, "..", "src", "index.ts"), "hook", "stop", "--agent", "claude-code"], { cwd: repo, env, stdin: new Blob([JSON.stringify({ cwd: repo, session_id: "s1", last_assistant_message: "done" })]) });
    expect(run().exitCode).toBe(0); const first = findActiveReview(repo); expect(first?.origin?.sessionId).toBe("s1"); expect(first?.policy).toBe("required");
    expect(run().exitCode).toBe(0); expect(findActiveReview(repo)?.id).toBe(first?.id);
  });
});
