// read/write the .review json file and keep .review out of git via .gitignore.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReviewFile } from "../types";

// reads <dir>/.review; null if absent or unparseable.
export function readReview(dir: string): ReviewFile | null {
  const path = join(dir, ".review");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ReviewFile;
  } catch {
    return null;
  }
}

// writes <dir>/.review (pretty json, 2-space + trailing newline) then ensures .gitignore.
export function writeReview(dir: string, review: ReviewFile): void {
  const path = join(dir, ".review");
  writeFileSync(path, `${JSON.stringify(review, null, 2)}\n`);
  appendToGitignore(dir);
}

// append .review to an existing .gitignore if not already listed. never creates the file.
function appendToGitignore(dir: string): void {
  const path = join(dir, ".gitignore");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  const alreadyListed = content
    .split(/\r?\n/)
    .some((line) => line.trim() === ".review");
  if (alreadyListed) return;

  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  writeFileSync(path, `${content}${separator}.review\n`);
  console.log("[loupe] Added .review to .gitignore");
}
