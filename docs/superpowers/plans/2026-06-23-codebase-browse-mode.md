# Codebase Browse Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `loupe browse [path]` mode that points loupe's existing comment/compile UI at the whole tracked codebase instead of a git diff.

**Architecture:** Each file is modelled as a `DiffFile` with one hunk whose lines are all `type: "context"` (`oldLine === newLine`). This "all-context diff" reuses the entire existing pipeline (file tree, diff view, comment anchoring, prompt compiler) unchanged. New code is confined to a `projectScan` sourcing module, CLI parsing, an entry-point branch, a server-refresh branch, and a few cosmetic UI gates keyed on `meta.mode === "browse"`.

**Tech Stack:** Bun (runtime, `Bun.serve`, `bun test`), TypeScript (strict, no build), buildless Preact + htm on the client. No new dependencies.

Reference spec: [`docs/superpowers/specs/2026-06-23-codebase-browse-mode-design.md`](../specs/2026-06-23-codebase-browse-mode-design.md).

---

## File structure

| File | Responsibility |
|---|---|
| `src/core/projectScan.ts` | **new** — turn the repo's tracked files into an all-context `DiffResult` |
| `tests/projectScan.test.ts` | **new** — unit + integration tests for the scan |
| `src/utils/cli.ts` | parse the `browse` command + optional path scope |
| `tests/cli.test.ts` | extend for `browse` parsing (and fix two whole-object assertions) |
| `src/index.ts` | branch to `projectScan` when the spec is `browse` |
| `src/server/handlers.ts` | optional `mode`/`scope` on context; re-scan on refresh in browse mode |
| `src/client/app.js` | derive `browse`, force unified view, pass `browse` to the tree |
| `src/client/topBar.js` | browse header (no source→target), hide delta + split toggle |
| `src/client/fileTree.js` | hide change badges + per-file deltas in browse mode |
| `src/client/diffLines.js` | suppress the hunk-header pill when the header is empty |
| `CHANGELOG.md`, `README.md` | document the feature (no version bump — release is a later, approved step) |

Unchanged (verified): `src/types.ts`, `src/core/reviewStore.ts`, `src/core/promptCompiler.ts`, `src/core/anchor.ts`.

---

## Task 1: `projectScan` core module

**Files:**
- Create: `src/core/projectScan.ts`
- Test: `tests/projectScan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/projectScan.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contextFile, scanProject } from "../src/core/projectScan";

function git(args: string[], cwd: string): void {
  Bun.spawnSync(["git", ...args], { cwd });
}

describe("contextFile", () => {
  it("numbers every line from 1 and marks them all context", () => {
    const f = contextFile("a.ts", "const x = 1\nconst y = 2\n");
    expect(f.changeType).toBe("modified");
    expect(f.additions).toBe(0);
    expect(f.deletions).toBe(0);
    expect(f.hunks).toHaveLength(1);
    expect(f.hunks[0]!.lines).toEqual([
      { type: "context", oldLine: 1, newLine: 1, content: "const x = 1" },
      { type: "context", oldLine: 2, newLine: 2, content: "const y = 2" },
    ]);
  });

  it("drops a single trailing empty line from a terminating newline", () => {
    const f = contextFile("a.ts", "one\ntwo\n");
    expect(f.hunks[0]!.lines.map((l) => l.content)).toEqual(["one", "two"]);
  });

  it("keeps internal blank lines", () => {
    const f = contextFile("a.ts", "one\n\nthree\n");
    expect(f.hunks[0]!.lines.map((l) => l.content)).toEqual(["one", "", "three"]);
  });

  it("handles a single line with no trailing newline", () => {
    const f = contextFile("a.ts", "only");
    expect(f.hunks[0]!.lines.map((l) => l.content)).toEqual(["only"]);
  });
});

describe("scanProject", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "loupe-scan-"));
    git(["init", "-q", "-b", "main"], dir);
    git(["config", "user.name", "t"], dir);
    git(["config", "user.email", "t@e.com"], dir);
  });
  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // windows occasionally holds a .git pack handle; cleanup is best-effort
    }
  });

  it("returns every tracked file as an all-context diff", () => {
    writeFileSync(join(dir, "a.ts"), "export const a = 1\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "b.ts"), "export const b = 2\n");
    git(["add", "-A"], dir);

    const diff = scanProject(dir);
    expect(diff.ref).toBe("codebase");
    expect(diff.meta?.mode).toBe("browse");
    expect(diff.files.map((f) => f.path).sort()).toEqual(["a.ts", "src/b.ts"]);
    expect(
      diff.files.every((f) => f.hunks.every((h) => h.lines.every((l) => l.type === "context")))
    ).toBe(true);
  });

  it("flags binary files (NUL byte) without hunks", () => {
    writeFileSync(join(dir, "data.bin"), Buffer.from([0x01, 0x00, 0x02]));
    git(["add", "-A"], dir);
    const bin = scanProject(dir).files.find((f) => f.path === "data.bin");
    expect(bin?.binary).toBe(true);
    expect(bin?.hunks).toEqual([]);
  });

  it("scopes the scan to a path argument", () => {
    writeFileSync(join(dir, "root.ts"), "1\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "in.ts"), "2\n");
    git(["add", "-A"], dir);
    expect(scanProject(dir, "src").files.map((f) => f.path)).toEqual(["src/in.ts"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/projectScan.test.ts`
Expected: FAIL — `Cannot find module "../src/core/projectScan"` (the module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/core/projectScan.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test tests/projectScan.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/projectScan.ts tests/projectScan.test.ts
git commit -m "feat(parser): scan tracked files into an all-context diff for browse mode"
```

---

## Task 2: CLI parsing for `browse [path]`

**Files:**
- Modify: `src/utils/cli.ts`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Update existing whole-object assertions, then add failing tests**

In `tests/cli.test.ts`, the defaults test (line ~6) and the combine test (line ~32) assert the *entire* options object with `toEqual`; both must gain `scope: undefined`. Replace those two assertions:

```ts
  test("defaults: working tree, random port, open browser", () => {
    expect(parseCliArgs([])).toEqual({ spec: undefined, scope: undefined, port: 0, open: true, help: false, version: false });
  });
```

```ts
  test("flags combine with a ref spec in any order", () => {
    const opts = parseCliArgs(["--no-open", "origin/main", "-p", "4000"]);
    expect(opts).toEqual({ spec: "origin/main", scope: undefined, port: 4000, open: false, help: false, version: false });
  });
```

Then add these tests inside the `describe("parseCliArgs", ...)` block:

```ts
  test("parses the browse command", () => {
    expect(parseCliArgs(["browse"]).spec).toBe("browse");
    expect(parseCliArgs(["browse"]).scope).toBeUndefined();
  });

  test("browse accepts an optional path scope", () => {
    const opts = parseCliArgs(["browse", "src/"]);
    expect(opts.spec).toBe("browse");
    expect(opts.scope).toBe("src/");
  });

  test("a second positional is only allowed after browse", () => {
    expect(() => parseCliArgs(["main", "src/"])).toThrow("unexpected argument: src/");
  });

  test("usage documents browse", () => {
    expect(USAGE).toContain("browse");
  });
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `bun test tests/cli.test.ts`
Expected: FAIL — `browse accepts an optional path scope` throws "unexpected argument: src/", and `usage documents browse` fails (USAGE has no "browse" yet). The two updated whole-object tests also currently fail (object lacks `scope`).

- [ ] **Step 3: Implement the parsing**

In `src/utils/cli.ts`, add `scope` to the interface:

```ts
export interface CliOptions {
  spec: string | undefined; // ref spec; absent = working tree vs HEAD
  scope: string | undefined; // path scope for `browse`; ignored otherwise
  port: number; // 0 = any free port
  open: boolean; // open the browser once serving
  help: boolean;
  version: boolean;
}
```

Add a `browse` line to `USAGE` under the `Refs` block (after the `<ref1>..<ref2>` line):

```
  browse [path]     review the whole codebase (optionally scoped to a path)
```

Initialise `scope` and accept the second positional only after `browse`. Replace the options initialiser and the trailing positional branches:

```ts
  const opts: CliOptions = { spec: undefined, scope: undefined, port: 0, open: true, help: false, version: false };
```

```ts
    } else if (opts.spec === undefined) {
      opts.spec = arg;
    } else if (opts.spec === "browse" && opts.scope === undefined) {
      opts.scope = arg;
    } else {
      throw new Error(`unexpected argument: ${arg} (only one ref spec, try --help)`);
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test tests/cli.test.ts`
Expected: PASS — all cli tests green (including the two updated whole-object assertions).

- [ ] **Step 5: Commit**

```bash
git add src/utils/cli.ts tests/cli.test.ts
git commit -m "feat(cli): parse the browse command and optional path scope"
```

---

## Task 3: Launch browse mode from the entry point

**Files:**
- Modify: `src/index.ts`

No unit test — `main()` performs IO/serving and is not unit-tested in this project (matches existing convention). Verified by running the binary in Step 3.

- [ ] **Step 1: Import the scanner**

In `src/index.ts`, add to the imports near the top:

```ts
import { scanProject } from "./core/projectScan";
```

- [ ] **Step 2: Branch the diff build and context on the mode**

Replace the diff-building block (the `let diff; ... } catch (err) { fail(...) }` section and the `ctx` line) with:

```ts
  let diff;
  let newRef: string | null = null;
  let diffArgs: string[] = [];
  let includeUntracked = false;
  let meta: DiffMeta | undefined;
  const mode: "diff" | "browse" = opts.spec === "browse" ? "browse" : "diff";
  try {
    if (mode === "browse") {
      diff = scanProject(cwd, opts.scope);
      meta = diff.meta;
    } else {
      const plan = resolveRef(opts.spec, cwd);
      newRef = plan.newRef;
      diffArgs = plan.diffArgs;
      includeUntracked = plan.includeUntracked;
      meta = { repo: repoName(cwd), mode: plan.mode, source: plan.source, target: plan.target };
      diff = { ...parseDiff(collectDiff(plan.diffArgs, cwd, includeUntracked), plan.refLabel), meta };
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  const clientDir = join(import.meta.dir, "client");
  const ctx = { diff, cwd, clientDir, loupeRoot, newRef, diffArgs, includeUntracked, meta, mode, scope: opts.scope, served: false };
```

- [ ] **Step 3: Adjust the launch banner wording for browse**

Replace the two banner lines near the end of `main()`:

```ts
  const files = diff.files.length;
  const changed = mode === "browse" ? "" : " changed";
  console.log(`${accent("✻ loupe")} ${dim(`v${currentVersion(loupeRoot)}`)} — reviewing ${bold(diff.ref)} (${files} file${files === 1 ? "" : "s"}${changed})`);
  console.log(`  ${bold(url)}  ${dim("(ctrl+c to stop)")}`);
```

- [ ] **Step 4: Verify it launches and serves browse data**

Run: `bun src/index.ts browse --no-open --port 7799` (in the loupe repo), then in another shell:
`curl -s http://localhost:7799/api/diff | head -c 200`
Expected: JSON beginning `{"ref":"codebase",...}` with `"mode":"browse"`. Stop the server (Ctrl+C). Also confirm `bun src/index.ts --no-open --port 7799` still prints `… changed)` for diff mode.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat(cli): launch browse mode from the entry point"
```

---

## Task 4: Server refresh for browse mode

**Files:**
- Modify: `src/server/handlers.ts`

`mode` is **optional** on `ServerContext` so existing `createServer({...})` callers (e.g. `tests/router.test.ts`) keep working unchanged and behave as diff mode.

- [ ] **Step 1: Import the scanner and extend the context**

In `src/server/handlers.ts`, add the import:

```ts
import { collectDiff, runGit } from "../utils/git";
import { scanProject } from "../core/projectScan";
```

Add two optional fields to the `ServerContext` interface (after `meta?`):

```ts
  meta?: DiffMeta; // stable review context (repo + refs); reused across refreshes
  mode?: "diff" | "browse"; // browse re-scans the codebase on refresh instead of re-diffing
  scope?: string; // browse path scope, reused on refresh
  served: boolean; // true once the launch-computed diff has been handed to the client
```

- [ ] **Step 2: Branch the refresh on the mode**

Replace the body of `handleGetDiff`:

```ts
export function handleGetDiff(ctx: ServerContext): Response {
  if (!ctx.served) {
    ctx.served = true;
    return json(ctx.diff);
  }
  try {
    ctx.diff =
      ctx.mode === "browse"
        ? scanProject(ctx.cwd, ctx.scope)
        : { ...parseDiff(collectDiff(ctx.diffArgs, ctx.cwd, ctx.includeUntracked), ctx.diff.ref), meta: ctx.meta };
  } catch {
    // keep the previous diff
  }
  return json(ctx.diff);
}
```

- [ ] **Step 3: Verify existing server tests still pass and the file is within the line cap**

Run: `bun test tests/router.test.ts`
Expected: PASS — all router tests green (diff-mode behavior unchanged).

Confirm `src/server/handlers.ts` is still ≤ 200 lines:
Run: `bun -e "console.log(require('fs').readFileSync('src/server/handlers.ts','utf8').split('\n').length)"`
Expected: a number ≤ 200 (around 170). If over, extract the refresh ternary into a small `recomputeDiff(ctx)` helper.

- [ ] **Step 4: Commit**

```bash
git add src/server/handlers.ts
git commit -m "feat(server): re-scan the codebase on refresh in browse mode"
```

---

## Task 5: Browse-mode UI gating

**Files:**
- Modify: `src/client/app.js`, `src/client/topBar.js`, `src/client/fileTree.js`, `src/client/diffLines.js`

No `bun test` coverage (the buildless frontend is not tested by `bun test`). Verified in a browser in Task 7.

- [ ] **Step 1: `app.js` — derive `browse`, force unified, pass it to the tree**

In `src/client/app.js`, immediately after the `if (!diff) return html\`<${LoadingScreen} />\`;` guard, add:

```js
  const browse = diff.meta?.mode === "browse";
```

In the `FileTree` element, add the `browse` prop (alongside `width`):

```js
        width=${sidebarWidth}
        browse=${browse}
      />
```

In the `DiffView` element, gate split view off in browse mode — change:

```js
        splitView=${splitView}
```
to:
```js
        splitView=${splitView && !browse}
```

- [ ] **Step 2: `topBar.js` — browse header, hide delta + split toggle**

Replace the `DiffInfo` function to add a browse branch (repo + mode pill, no source→target):

```js
// repo + mode + "source → target" so you know exactly what you're reviewing.
function DiffInfo({ meta, refLabel }) {
  if (!meta) return html`<span class="ref-label" title=${refLabel}>${refLabel}</span>`;
  if (meta.mode === "browse")
    return html`<span class="diff-info">
      <span class="repo-name" title=${meta.repo}>${meta.repo}</span>
      <span class="mode-pill">${meta.mode}</span>
    </span>`;
  return html`<span class="diff-info">
    <span class="repo-name" title=${meta.repo}>${meta.repo}</span>
    <span class="mode-pill">${meta.mode}</span>
    <span class="ref-pair" title=${`${meta.source} → ${meta.target}`}>
      ${meta.source} <span class="arrow">→</span> ${meta.target}
    </span>
  </span>`;
}
```

In `TopBar`, derive `browse` after the existing `const { add, del } = totalDelta(files);` line:

```js
  const { add, del } = totalDelta(files);
  const browse = meta?.mode === "browse";
```

Wrap the `top-delta` span so it is hidden in browse mode — replace:

```js
      <span class="top-delta">
        <span class="add">+${add}</span>
        <span class="del">-${del}</span>
      </span>
```
with:
```js
      ${!browse &&
      html`<span class="top-delta">
        <span class="add">+${add}</span>
        <span class="del">-${del}</span>
      </span>`}
```

Wrap the split-view toggle button (the one rendering `<${Columns} />`) so it is hidden in browse mode — replace:

```js
      <button class="btn-icon icon-btn ${splitView ? "on" : ""}" data-tip=${splitTip} aria-label=${splitTip} onClick=${onToggleSplit}>
        <${Columns} />
      </button>
```
with:
```js
      ${!browse &&
      html`<button class="btn-icon icon-btn ${splitView ? "on" : ""}" data-tip=${splitTip} aria-label=${splitTip} onClick=${onToggleSplit}>
        <${Columns} />
      </button>`}
```

- [ ] **Step 3: `fileTree.js` — hide change badges + deltas in browse mode**

Add `browse` to the `FileRow` signature and gate the badge + delta. Replace the `FileRow` function:

```js
function FileRow({ file, viewed, commentCount, active, browse, onSelect, onToggleViewed }) {
  return html`<div class="tree-file ${active ? "active" : ""}" onClick=${() => onSelect(file.path)}>
    <span class="tree-file-name" title=${file.path}>${file.name}</span>
    ${!browse && html`<span class="badge badge-${file.changeType}">${changeBadge(file.changeType)}</span>`}
    ${!browse &&
    html`<span class="tree-delta">
      <span class="add">+${file.additions}</span>
      <span class="del">-${file.deletions}</span>
    </span>`}
    ${commentCount > 0 && html`<span class="comment-dot" title=${`${commentCount} comment(s)`}></span>`}
    <input
      type="checkbox"
      class="viewed-check"
      title="Viewed"
      checked=${viewed}
      onClick=${(e) => e.stopPropagation()}
      onChange=${() => onToggleViewed(file.path)}
    />
  </div>`;
}
```

Thread `browse` through `FileTree` — change the signature and the `rest` object:

```js
export function FileTree({ files, viewedSet, countFor, activeFile, onSelect, onToggleViewed, width, browse }) {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const shown = needle ? files.filter((f) => f.path.toLowerCase().includes(needle)) : files;
  const root = buildTree(shown);
  const rest = { viewedSet, countFor, activeFile, onSelect, onToggleViewed, browse };
```

`Folder` already spreads `...rest`, so nested rows receive `browse`. The root-level `FileRow` (the one at the bottom that lists props explicitly) must add it — change that element to include `browse=${browse}`:

```js
      ${root.files.map(
        (f) => html`<${FileRow}
          key=${f.path}
          file=${f}
          viewed=${viewedSet.has(f.path)}
          commentCount=${countFor(f.path)}
          active=${activeFile === f.path}
          browse=${browse}
          onSelect=${onSelect}
          onToggleViewed=${onToggleViewed}
        />`
      )}
```

- [ ] **Step 4: `diffLines.js` — suppress the empty hunk-header pill**

In `UnifiedHunk`, gate the hunk-header row on a non-empty header — replace:

```js
    <tr class="hunk-header">
      <td colspan="4"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>
```
with:
```js
    ${hunk.header &&
    html`<tr class="hunk-header">
      <td colspan="4"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>`}
```

In `SplitHunk`, do the same (note `colspan="6"`) — replace:

```js
    <tr class="hunk-header">
      <td colspan="6"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>
```
with:
```js
    ${hunk.header &&
    html`<tr class="hunk-header">
      <td colspan="6"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>`}
```

- [ ] **Step 5: Commit**

```bash
git add src/client/app.js src/client/topBar.js src/client/fileTree.js src/client/diffLines.js
git commit -m "feat(ui): adapt the review chrome for browse mode"
```

---

## Task 6: Documentation

**Files:**
- Modify: `CHANGELOG.md`, `README.md`

No version bump / tag / release here — that is a separate, user-approved step.

- [ ] **Step 1: Add an Unreleased changelog entry**

In `CHANGELOG.md`, under `## [Unreleased]`, add:

```markdown
## [Unreleased]

### Added
- **Codebase browse mode** — `loupe browse [path]` opens the whole tracked codebase (optionally scoped to a subtree) in the same review UI, so you can read every file and leave inline questions/notes, then **Compile Review Prompt** to feed an LLM for onboarding or learning. Comments share the existing `.review` store.
```

- [ ] **Step 2: Document the command in the README**

In `README.md`, under the usage block, add a line alongside the other invocations:

```
    bun src/index.ts browse           # review the whole codebase
    bun src/index.ts browse src/      # scope to a subtree
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md README.md
git commit -m "docs: document codebase browse mode"
```

---

## Task 7: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `bun test`
Expected: PASS — all suites green (existing + the new `projectScan` + extended `cli`).

- [ ] **Step 2: Typecheck**

Run: `bun x tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Browser smoke test (not covered by `bun test`)**

Launch `loupe browse` on the loupe repo itself and confirm in the browser:
1. Top bar reads `loupe … <repo> · browse` with **no** `+N/-N` delta and **no** side-by-side toggle; the file count shows total tracked files.
2. The file tree lists all tracked files with **no** A/M/D/R badges and **no** per-file deltas; filter, viewed checkboxes, and progress bar still work.
3. Opening files shows full contents with a comment bubble on every line and **no** empty hunk-header pills.
4. Add a line comment and a file-level comment in two files; mark one viewed.
5. Click **Compile Review Prompt**; the prompt is titled `## Code Review — codebase — <date>` and contains each comment with its code context.
6. Regression: launch plain `loupe` (diff mode) and confirm badges, deltas, the split toggle, and the source→target header all still appear.

- [ ] **Step 4: Report results**

Summarize: tests/typecheck output, what the browser check showed (with a screenshot of browse mode), and any decisions made during implementation.

---

## Self-review notes

- **Spec coverage:** CLI command (Task 2/3), `projectScan` all-context build incl. binary + scope (Task 1), eager launch (Task 3), server refresh (Task 4), reuse of `.review` + compiler (no tasks needed — untouched, confirmed by passing `router.test.ts` whose compile test still asserts `## Code Review`), UI gating incl. empty hunk pill (Task 5), docs (Task 6), verification incl. browser (Task 7). No version bump (deferred per user).
- **Type consistency:** `scanProject(cwd, scope?)` / `contextFile(path, text)` signatures match between the module (Task 1) and its callers in `index.ts` (Task 3) and `handlers.ts` (Task 4). `ServerContext.mode` is the same `"diff" | "browse"` union in `handlers.ts` and the value set in `index.ts`. `CliOptions.scope` added in Task 2 is consumed in Task 3.
- **No placeholders:** every code step shows complete code; commands include expected output.
