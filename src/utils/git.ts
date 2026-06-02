// git shell helpers: run git, and resolve a cli ref spec into a concrete diff plan.

// how to produce the diff plus a human-readable label for the ui.
export interface DiffPlan {
  diffArgs: string[]; // args passed to `git`, e.g. ["diff", "HEAD"]
  refLabel: string; // shown in the top bar, e.g. "working tree" or "feature/x → origin/main"
}

// runs `git <args>` in cwd and returns raw stdout. throws with stderr on failure.
export function runGit(args: string[], cwd: string): string {
  const proc = Bun.spawnSync(["git", ...args], { cwd });
  if (proc.exitCode !== 0) {
    throw new Error(proc.stderr.toString().trim() || `git ${args.join(" ")} failed`);
  }
  return proc.stdout.toString();
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

  if (!spec) return { diffArgs: ["diff", "HEAD"], refLabel: "working tree" };
  if (spec === "staged") return { diffArgs: ["diff", "--staged"], refLabel: "staged" };

  const parts = spec.split("..");
  if (parts.length === 2) {
    const [from, to] = parts as [string, string];
    for (const ref of [from, to]) {
      if (ref && !refExists(ref, cwd)) throw new Error(`unknown ref: ${ref}`);
    }
    return { diffArgs: ["diff", spec], refLabel: `${from} → ${to}` };
  }

  // a single named branch: show what the current branch added relative to it (pr-style three-dot)
  if (!refExists(spec, cwd)) throw new Error(`unknown ref: ${spec}`);
  return { diffArgs: ["diff", `${spec}...HEAD`], refLabel: `${currentBranch(cwd)} → ${spec}` };
}
