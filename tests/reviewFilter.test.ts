import { describe, it, expect } from "bun:test";
import type { DiffFile, DiffResult } from "../src/types";
import { excludeReviewFile } from "../src/core/reviewFilter";

const file = (path: string, oldPath: string | null = null): DiffFile => ({
  path,
  oldPath,
  changeType: "modified",
  additions: 0,
  deletions: 0,
  hunks: [],
});

const diff = (...files: DiffFile[]): DiffResult => ({ ref: "wt", files });

describe("excludeReviewFile", () => {
  it("drops .review from the file list", () => {
    const out = excludeReviewFile(diff(file("a.ts"), file(".review")), false);
    expect(out.files.map((f) => f.path)).toEqual(["a.ts"]);
  });

  it("drops a .review that was renamed away from", () => {
    const out = excludeReviewFile(diff(file("notes.json", ".review")), false);
    expect(out.files).toEqual([]);
  });

  it("keeps .review when the user opted in", () => {
    const input = diff(file("a.ts"), file(".review"));
    expect(excludeReviewFile(input, true)).toBe(input);
  });

  it("returns the same object when there is nothing to drop", () => {
    const input = diff(file("a.ts"));
    expect(excludeReviewFile(input, false)).toBe(input);
  });

  it("preserves ref and meta", () => {
    const input: DiffResult = {
      ref: "codebase",
      meta: { repo: "o/r", mode: "browse", source: "codebase", target: "" },
      files: [file(".review"), file("a.ts")],
    };
    const out = excludeReviewFile(input, false);
    expect(out.ref).toBe("codebase");
    expect(out.meta).toEqual(input.meta);
    expect(out.files.map((f) => f.path)).toEqual(["a.ts"]);
  });
});
