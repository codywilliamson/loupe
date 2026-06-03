import type { DiffResult, ReviewFile, Comment, DiffFile, DiffLine } from "../types";

// assembles inline review comments + their diff context into a markdown prompt.
// pure: all header values derive from inputs, no clock access.

const DIVIDER = "\n\n---\n\n";

// only context + additions carry a new-file line number; deletions are dropped.
function newLineSlice(file: DiffFile): DiffLine[] {
  return file.hunks.flatMap((h) => h.lines).filter((l) => l.newLine !== null);
}

function markerFor(line: DiffLine): string {
  if (line.type === "addition") return "+";
  if (line.type === "deletion") return "-";
  return " ";
}

// builds the 4-space-indented context block around the commented range.
// window is 2 lines above `start` and 2 below `end`, clamped at file boundaries.
// every line whose newLine is in [start, end] is marked with `> `; others are context.
function buildContextBlock(file: DiffFile, start: number, end: number): string {
  const slice = newLineSlice(file);
  const startIdx = slice.findIndex((l) => l.newLine === start);
  const endIdx = slice.findIndex((l) => l.newLine === end);
  if (startIdx === -1 || endIdx === -1) return "";

  const from = Math.max(0, startIdx - 2);
  const to = Math.min(slice.length - 1, endIdx + 2);
  const window = slice.slice(from, to + 1);

  const width = Math.max(...window.map((l) => String(l.newLine).length));
  return window
    .map((l) => {
      const num = String(l.newLine).padStart(width, " ");
      const inRange = l.newLine !== null && l.newLine >= start && l.newLine <= end;
      if (inRange) return `  > ${num} | ${markerFor(l)}${l.content}`;
      return `    ${num} | ${l.content}`;
    })
    .join("\n");
}

// joins multiple comment texts on one target with a blank line between them.
function joinTexts(comments: Comment[]): string {
  return comments.map((c) => c.text).join("\n\n");
}

function fileLevelSection(file: string, comments: Comment[]): string {
  // file-level: header then the comment text directly, no code block.
  return `### ${file} — File-level\n\n${joinTexts(comments)}`;
}

// the inclusive end of a comment's range; single-line when absent/null/equal-to-line.
function rangeEnd(c: Comment): number {
  return c.endLine != null ? Math.max(c.line as number, c.endLine) : (c.line as number);
}

function lineSection(file: string, diffFile: DiffFile | undefined, start: number, end: number, comments: Comment[]): string {
  // single line uses "Line n"; a range uses "Lines start–end" with an en dash.
  const header = start === end ? `### ${file} — Line ${start}` : `### ${file} — Lines ${start}–${end}`;
  const block = diffFile ? buildContextBlock(diffFile, start, end) : "";
  // comments sharing the exact range share one block; different ranges are separate sections.
  return `${header}\n\n${block}\n\n${joinTexts(comments)}`;
}

// groups a file's comments into ordered sections: file-level first, then by range
// (start asc, then end asc). comments with the same start+end merge into one section.
function sectionsForFile(file: string, diffFile: DiffFile | undefined, comments: Comment[]): string[] {
  const out: string[] = [];

  const fileLevel = comments.filter((c) => c.line === null);
  if (fileLevel.length > 0) out.push(fileLevelSection(file, fileLevel));

  const byRange = new Map<string, { start: number; end: number; comments: Comment[] }>();
  for (const c of comments) {
    if (c.line === null) continue;
    const start = c.line;
    const end = rangeEnd(c);
    const key = `${start}:${end}`;
    const bucket = byRange.get(key) ?? { start, end, comments: [] };
    bucket.comments.push(c);
    byRange.set(key, bucket);
  }

  const ranges = [...byRange.values()].sort((a, b) => a.start - b.start || a.end - b.end);
  for (const r of ranges) {
    out.push(lineSection(file, diffFile, r.start, r.end, r.comments));
  }
  return out;
}

export function compileReviewPrompt(diff: DiffResult, review: ReviewFile): string {
  const ref = review.meta.ref;
  const date = review.meta.updatedAt.slice(0, 10);
  const title = `## Code Review — ${ref} — ${date}`;

  const byFile = new Map<string, Comment[]>();
  for (const c of review.comments) {
    const bucket = byFile.get(c.file) ?? [];
    bucket.push(c);
    byFile.set(c.file, bucket);
  }

  const diffByPath = new Map(diff.files.map((f) => [f.path, f]));

  const sections: string[] = [];
  for (const file of [...byFile.keys()].sort()) {
    sections.push(...sectionsForFile(file, diffByPath.get(file), byFile.get(file) ?? []));
  }

  const total = review.comments.length;
  const fileCount = byFile.size;
  const summary = `## Summary: ${total} comment(s) across ${fileCount} file(s)`;

  const body = sections.length > 0 ? sections.join(DIVIDER) + DIVIDER : "";
  return `${title}${DIVIDER}${body}${summary}`;
}
