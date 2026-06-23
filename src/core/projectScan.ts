// builds an all-context DiffResult from the repo's tracked files so loupe can browse and
// comment on the whole codebase. each file becomes one hunk of context lines (oldLine ===
// newLine), which the existing diff view, anchoring, and prompt compiler already handle.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiffResult, DiffFile, DiffLine } from "../types";
import { runGit, repoName } from "../utils/git";

// tracked files under the optional scope path, in git's order. respects .gitignore.
function trackedFiles(cwd: string, scope: string | undefined): string[] {
  const args = ["ls-files", "-z"];
  if (scope) args.push("--", scope);
  return runGit(args, cwd).split("\0").filter(Boolean);
}

// one file's text as all-context lines numbered from 1; a single trailing empty line from
// a terminating newline is dropped so files don't render a phantom blank last row.
export function contextFile(path: string, text: string): DiffFile {
  const raw = text.split("\n");
  if (raw.length > 1 && raw[raw.length - 1] === "") raw.pop();
  const lines: DiffLine[] = raw.map((content, i): DiffLine => ({
    type: "context",
    oldLine: i + 1,
    newLine: i + 1,
    content,
  }));
  return { path, oldPath: null, changeType: "modified", additions: 0, deletions: 0, hunks: [{ header: "", lines }] };
}

// binary files (a NUL byte present) render like binary diff entries: flagged, no hunks.
function readFileAsDiff(cwd: string, path: string): DiffFile {
  const buf = readFileSync(join(cwd, path));
  if (buf.includes(0)) {
    return { path, oldPath: null, changeType: "modified", additions: 0, deletions: 0, binary: true, hunks: [] };
  }
  return contextFile(path, buf.toString("utf8"));
}

export function scanProject(cwd: string, scope?: string): DiffResult {
  const files = trackedFiles(cwd, scope).map((p) => readFileAsDiff(cwd, p));
  return {
    ref: "codebase",
    meta: { repo: repoName(cwd), mode: "browse", source: "codebase", target: "" },
    files,
  };
}
