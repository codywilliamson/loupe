import { describe, expect, test } from "bun:test";
// pure client module with no imports — testable directly under bun.
import { pairLines, diffRange, hunkMarks, markRange } from "../src/client/wordDiff.js";

const del = (content: string, oldLine = 1) => ({ type: "deletion", oldLine, newLine: null, content });
const add = (content: string, newLine = 1) => ({ type: "addition", oldLine: null, newLine, content });
const ctx = (content: string, n = 1) => ({ type: "context", oldLine: n, newLine: n, content });

describe("pairLines", () => {
  test("pairs deletion/addition runs and mirrors context", () => {
    const lines = [ctx("a"), del("x"), del("y"), add("X"), ctx("b")];
    const rows = pairLines(lines);
    expect(rows).toHaveLength(4);
    expect(rows[1]).toEqual({ left: lines[1], right: lines[3] });
    expect(rows[2]).toEqual({ left: lines[2], right: null });
  });
});

describe("diffRange", () => {
  test("finds the changed middle of a modified line", () => {
    const r = diffRange("const a = 1;", "const a = 2;");
    expect(r?.old).toEqual({ start: 10, end: 11 });
    expect(r?.new).toEqual({ start: 10, end: 11 });
  });

  test("returns null for identical lines", () => {
    expect(diffRange("same", "same")).toBeNull();
  });

  test("returns null when lines share nothing", () => {
    expect(diffRange("alpha beta", "gamma-delta!")).toBeNull();
  });

  test("pure insertion yields an empty old range", () => {
    const r = diffRange("a c", "a b c");
    expect(r?.old.start).toBe(r?.old.end);
    expect(r?.new.end).toBeGreaterThan(r?.new.start ?? 0);
  });
});

describe("hunkMarks", () => {
  test("marks both sides of a modified pair, skips unpaired lines", () => {
    const d = del("let total = 1;");
    const a = add("let total = 2;");
    const lonely = add("brand new line", 2);
    const marks = hunkMarks([ctx("x"), d, a, lonely]);
    expect(marks.get(d)).toEqual({ start: 12, end: 13 });
    expect(marks.get(a)).toEqual({ start: 12, end: 13 });
    expect(marks.has(lonely)).toBe(false);
  });
});

describe("markRange", () => {
  test("wraps a plain text range", () => {
    expect(markRange("hello world", 6, 11, "wd")).toBe('hello <mark class="wd">world</mark>');
  });

  test("reopens the mark across tag boundaries", () => {
    const html = '<span class="hljs-keyword">const</span> x';
    expect(markRange(html, 0, 7, "wd")).toBe(
      '<span class="hljs-keyword"><mark class="wd">const</mark></span><mark class="wd"> x</mark>'
    );
  });

  test("counts entities as one char", () => {
    expect(markRange("a &amp; b", 2, 3, "wd")).toBe('a <mark class="wd">&amp;</mark> b');
  });

  test("returns input unchanged for an empty range", () => {
    expect(markRange("abc", 1, 1, "wd")).toBe("abc");
  });
});
