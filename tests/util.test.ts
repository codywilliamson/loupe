import { describe, expect, test } from "bun:test";
// pure client module, no dom — testable directly under bun.
import { lineCountOf, estimatedHeight, ROW_HEIGHT } from "../src/client/util.js";

const file = (counts: number[]) => ({
  hunks: counts.map((n) => ({ header: "@@", lines: Array.from({ length: n }, () => ({})) })),
});

describe("lineCountOf", () => {
  test("sums lines across hunks", () => {
    expect(lineCountOf(file([3, 4]))).toBe(7);
  });
  test("zero for no hunks (binary)", () => {
    expect(lineCountOf(file([]))).toBe(0);
  });
});

describe("estimatedHeight", () => {
  test("scales with line count plus a hunk header row per hunk", () => {
    expect(estimatedHeight(file([10]))).toBe(11 * ROW_HEIGHT);
  });
  test("has a floor for empty files", () => {
    expect(estimatedHeight(file([]))).toBeGreaterThan(0);
  });
});
