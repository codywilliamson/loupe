// git shell helpers: run git, resolve a cli ref spec into a concrete diff plan, collect the diff.

import { basename } from "node:path";

// how to produce the diff plus the review context shown in the ui.
export interface DiffPlan {
  diffArgs: string[]; // args passed to `git`, e.g. ["diff", "HEAD"]
  refLabel: string; // shown in the top bar, e.g. "working tree" or "feature/x → origin/main"
  newRef: string | null; // ref for the "new" side content; null = working tree (read from disk)
  mode: string; // "working tree" | "staged" | "branch" | "range"
  source: string; // the "new" side label
  target: string; // the "base" side label
  includeUntracked: boolean; // working-tree mode also surfaces untracked files
}

// runs `git <args>` in cwd and returns raw stdout. throws with stderr on failure.
export function runGit(args: string[], cwd: string): string {
  const proc = Bun.spawnSync(["git", ...args], { cwd });
  if (proc.exitCode !== 0) {
    throw new Error(proc.stderr.toString().trim() || `git ${args.join(" ")} failed`);
  }
  return proc.stdout.toString();
}

// "owner/repo" from the origin remote, falling back to the working-dir folder name.
export function repoName(cwd: string): string {
  try {
    const url = runGit(["remote", "get-url", "origin"], cwd).trim();
    const m = /[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
    if (m && m[1]) return m[1];
  } catch {
    // no origin remote configured
  }
  return basename(cwd) || cwd;
}

// `git diff --no-index` exits 1 whenever the files differ (always true for a new file),
// so it can't go through runGit (which throws on non-zero). we just want its stdout.
function untrackedDiff(path: string, cwd: string): string {
  const proc = Bun.spawnSync(["git", "diff", "--no-index", "--", "/dev/null", path], { cwd });
  return proc.stdout.toString();
}

// runs the planned diff; in working-tree mode also appends synthetic "new file" diffs for
// untracked files (which `git diff` omits by design) so they show up and are commentable.
export function collectDiff(diffArgs: string[], cwd: string, includeUntracked: boolean): string {
  let raw = runGit(diffArgs, cwd);
  if (!includeUntracked) return raw;
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"], cwd)
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== ".review"); // never review loupe's own review file
  if (untracked.length && raw && !raw.endsWith("\n")) raw += "\n";
  for (const path of untracked) raw += untrackedDiff(path, cwd);
  return raw;
}

function isGitRepo(cwd: string): boolean {
  const proc = Bun.spawnSync(["git", "rev-parse", "--is-inside-work-tree"], { cwd });
  return proc.exitCode === 0;
}

function refExists(ref: string, cwd: string): boolean {
  return Bun.spawnSync(["git", "rev-parse", "--verify", "--quiet", ref], { cwd }).exitCode === 0;
}

function currentBranch(cwd: string): string {
  return runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd).trim();
}

// maps the optional cli arg into a diff plan, validating refs against the local repo.
// throws a clear message the cli can print before exiting.
export function resolveRef(spec: string | undefined, cwd: string): DiffPlan {
  if (!isGitRepo(cwd)) throw new Error("not a git repository (run loupe inside one)");

  if (!spec) {
    const target = currentBranch(cwd);
    return { diffArgs: ["diff", "HEAD"], refLabel: "working tree", newRef: null, mode: "working tree", source: "working tree", target, includeUntracked: true };
  }
  if (spec === "staged") {
    const target = currentBranch(cwd);
    return { diffArgs: ["diff", "--staged"], refLabel: "staged", newRef: "", mode: "staged", source: "staged", target, includeUntracked: false };
  }

  const parts = spec.split("..");
  if (parts.length === 2) {
    const [from, to] = parts as [string, string];
    for (const ref of [from, to]) {
      if (ref && !refExists(ref, cwd)) throw new Error(`unknown ref: ${ref}`);
    }
    return { diffArgs: ["diff", spec], refLabel: `${from} → ${to}`, newRef: to || "HEAD", mode: "range", source: from, target: to, includeUntracked: false };
  }

  // a single named branch: show what the current branch added relative to it (pr-style three-dot)
  if (!refExists(spec, cwd)) throw new Error(`unknown ref: ${spec}`);
  const branch = currentBranch(cwd);
  return { diffArgs: ["diff", `${spec}...HEAD`], refLabel: `${branch} → ${spec}`, newRef: "HEAD", mode: "branch", source: branch, target: spec, includeUntracked: false };
}
