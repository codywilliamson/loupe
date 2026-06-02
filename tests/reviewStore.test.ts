import { describe, it, expect, afterEach } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReviewFile } from "../src/types";
import { readReview, writeReview } from "../src/core/reviewStore";

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "fixtures", "sample.review.json"), "utf8"),
) as ReviewFile;

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "loupe-review-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("reviewStore", () => {
  it("reads an existing .review correctly", () => {
    const dir = tempDir();
    writeFileSync(join(dir, ".review"), JSON.stringify(fixture));
    expect(readReview(dir)).toEqual(fixture);
  });

  it("write then read round-trips an identical object", () => {
    const dir = tempDir();
    writeReview(dir, fixture);
    expect(readReview(dir)).toEqual(fixture);
  });

  it("returns null when no .review exists", () => {
    expect(readReview(tempDir())).toBeNull();
  });

  it("creates the .review file on first write", () => {
    const dir = tempDir();
    expect(existsSync(join(dir, ".review"))).toBe(false);
    writeReview(dir, fixture);
    expect(existsSync(join(dir, ".review"))).toBe(true);
  });

  it("appends .review to .gitignore when the entry is missing", () => {
    const dir = tempDir();
    writeFileSync(join(dir, ".gitignore"), "node_modules\n");
    writeReview(dir, fixture);
    const lines = readFileSync(join(dir, ".gitignore"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim());
    expect(lines).toContain(".review");
  });

  it("does not duplicate the .gitignore entry on a second write", () => {
    const dir = tempDir();
    writeFileSync(join(dir, ".gitignore"), "node_modules\n");
    writeReview(dir, fixture);
    writeReview(dir, fixture);
    const count = readFileSync(join(dir, ".gitignore"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() === ".review").length;
    expect(count).toBe(1);
  });

  it("does nothing to .gitignore when the file is absent", () => {
    const dir = tempDir();
    writeReview(dir, fixture);
    expect(existsSync(join(dir, ".gitignore"))).toBe(false);
  });
});
