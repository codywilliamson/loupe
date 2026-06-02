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

// builds the 4-space-indented context block around the commented line.
// window is ±2 of the new-line slice, clamped at hunk/file boundaries.
function buildContextBlock(file: DiffFile, target: number): string {
  const slice = newLineSlice(file);
  const idx = slice.findIndex((l) => l.newLine === target);
  if (idx === -1) return "";

  const from = Math.max(0, idx - 2);
  const to = Math.min(slice.length - 1, idx + 2);
  const window = slice.slice(from, to + 1);

  const width = Math.max(...window.map((l) => String(l.newLine).length));
  return window
    .map((l) => {
      const num = String(l.newLine).padStart(width, " ");
      if (l.newLine === target) return `  > ${num} | ${markerFor(l)}${l.content}`;
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

function lineSection(file: string, diffFile: DiffFile | undefined, line: number, comments: Comment[]): string {
  const header = `### ${file} — Line ${line}`;
  const block = diffFile ? buildContextBlock(diffFile, line) : "";
  // same-line comments share one block; different lines are separate sections.
  // range-merge across adjacent lines is intentionally out of scope (one line per comment).
  return `${header}\n\n${block}\n\n${joinTexts(comments)}`;
}

// groups a file's comments into ordered sections: file-level first, then by line asc.
function sectionsForFile(file: string, diffFile: DiffFile | undefined, comments: Comment[]): string[] {
  const out: string[] = [];

  const fileLevel = comments.filter((c) => c.line === null);
  if (fileLevel.length > 0) out.push(fileLevelSection(file, fileLevel));

  const byLine = new Map<number, Comment[]>();
  for (const c of comments) {
    if (c.line === null) continue;
    const bucket = byLine.get(c.line) ?? [];
    bucket.push(c);
    byLine.set(c.line, bucket);
  }

  for (const line of [...byLine.keys()].sort((a, b) => a - b)) {
    out.push(lineSection(file, diffFile, line, byLine.get(line) ?? []));
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
