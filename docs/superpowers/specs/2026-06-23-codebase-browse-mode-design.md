# Codebase Browse Mode — Design

> Status: approved design, ready for implementation planning.
> Date: 2026-06-23

## Summary

Add a second loupe mode that points the existing review UI at the **entire tracked
codebase** instead of a `git diff`. You browse every file, leave inline comments /
questions on any line using loupe's current comment infrastructure, and compile them
into the same structured prompt — for onboarding, learning, or feeding an LLM.

Entered with a new CLI command: `loupe browse [path]`.

## Goal & non-goals

**Goal:** reuse loupe's comment-and-compile workflow over the whole project, with the
smallest possible change to the existing diff-centric code.

**Non-goals (v1):**
- No live LLM calls — v1 stays paste-the-prompt, preserving the no-runtime-deps constraint. (Live integration is a deliberate later phase.)
- No lazy/on-demand file loading — v1 reads all files eagerly at launch (see Future).
- No new comment tags, no auto-generated "onboarding brief", no new compiled-prompt format.

## Core mechanism — the "all-context diff"

Represent each file as a `DiffFile` containing **one hunk whose lines are all
`type: "context"`** with `oldLine === newLine === <line number>` and `content` = the
line text. A whole file modelled this way is structurally a diff with no changes.

This is the entire trick: the existing file tree, diff view, comment add/edit/resolve,
viewed tracking, line anchoring (`isAnchored`), and `compileReviewPrompt` all already
handle context lines. Verified against `src/core/anchor.ts` (a "new"-side comment on
line N matches because `newLine === N`) and `src/client/diffLines.js` (context lines
anchor on the new side and render the comment bubble).

Consequence: **no parallel viewer/compiler subsystem, no duplicated types.**
`src/types.ts` stays the single source of truth.

## CLI

`loupe browse [path]`

- `browse` is recognised as the ref spec in `src/utils/cli.ts`.
- An optional second positional `path` scopes the scan to a subtree, e.g.
  `loupe browse src/`. The parser allows a second positional **only** when the spec is
  `browse`; otherwise the existing "only one ref spec" error stands.
- All existing options (`--port`, `--no-open`, `--version`, `--help`) apply unchanged.

## Sourcing — `src/core/projectScan.ts` (new module)

One job: build an all-context `DiffResult` from the repo. Target < 150 lines.

1. `git ls-files [path]` → list of tracked files (respects `.gitignore` for free;
   loupe's own `.review` is untracked/ignored, so it is never listed).
2. For each file, read it as a buffer:
   - if the buffer contains a NUL byte (`0x00`) → `binary: true`, empty `hunks`
     (reuses the existing binary-file rendering);
   - otherwise decode UTF-8, split into lines, drop a single trailing empty line from a
     terminating newline, and build one hunk of all-context `DiffLine`s numbered from 1.
3. Assemble `DiffResult`:
   - `ref: "codebase"`
   - `files`: as above, in `git ls-files` order
   - `meta: { repo: repoName(cwd), mode: "browse", source: "codebase", target: "" }`

`DiffFile.changeType` is set to `"modified"` as a neutral placeholder — it is never
displayed in browse mode (the badge is suppressed; see UI). `additions`/`deletions` are
`0`.

## Server — serve & refresh

- `src/index.ts`: when `opts.spec === "browse"`, build the diff via `projectScan(cwd, scope)`
  instead of `resolveRef` / `collectDiff` / `parseDiff`. Set `newRef = null` so
  `/api/file` (markdown preview) reads working-tree files from disk, exactly as in
  working-tree diff mode.
- `ServerContext` gains `mode: "diff" | "browse"` and an optional `scope?: string`.
- `handleGetDiff` branches on `ctx.mode`: in browse mode it re-runs `projectScan` on
  refresh; otherwise it re-runs `collectDiff` as today. The first-call `served`
  optimization (serve the launch-computed diff before recomputing) is kept for both.
- `/api/comments`, `/api/viewed`, `/api/compile`, `/api/file`, static serving: unchanged.
- Watch `src/server/handlers.ts` — currently 163 lines; the browse branch must keep it
  under the 200-line hard cap (extract a helper if it tips over).

## Persistence — reuse `.review`

Browse-mode comments are stored in the existing `.review` file via the existing
`reviewStore`. **No changes to `reviewStore.ts` or the gitignore helper.**

Known tradeoff (accepted): diff-review comments and browse questions share one store per
repo. In browse mode every file is present, so prior diff comments anchor and appear. In
diff mode, browse comments on unchanged files fall outside the diff and surface under
"From earlier reviews" in the compile dialog (existing orphaned-comment behavior). This
is acceptable for v1.

## Compiler — unchanged

`compileReviewPrompt` is used as-is. In browse mode the title renders
`## Code Review — codebase — <date>` (the `ref` is `"codebase"`). No compiler changes.

## UI changes (all gated on `meta.mode === "browse"`; diff mode untouched)

- **`src/client/topBar.js`**: show `repo · codebase · N files` instead of
  source → target; hide the `+N / -N` aggregate delta; hide the split-view toggle
  (side-by-side is meaningless when every line is context).
- **`src/client/fileTree.js`**: hide the change badges (A/M/D/R) and the `+N -N`
  per-file deltas. Keep the filter box, viewed checkboxes, viewed-progress bar, and
  comment-count dots.
- **`src/client/diffLines.js`**: suppress the hunk-header pill row when `header === ""`.

Single gutter in browse mode: the two line-number columns are identical, so the old-side
column is hidden via a `.app.browse` CSS rule, leaving one gutter.

## Data shapes — no contract changes

`DiffMeta.mode` is already typed as a free `string`, so `"browse"` flows through with no
edit to `src/types.ts`. No request/response body changes. `DiffResult`, `ReviewFile`,
`Comment` all unchanged.

## Testing

- **`projectScan`** (new test): the pure transform — file text → all-context `DiffFile`
  (line numbering from 1, trailing-newline handling), binary detection via a NUL byte,
  and the `git ls-files` + scope-path listing via a temp repo (`os.tmpdir()`, real
  `git init` + add). Aim for branch coverage on the pure parts.
- **`cli`** (extend): parse `browse` and `browse <path>`; reject a stray second
  positional when the spec is not `browse`.
- **`promptCompiler`** / **`reviewStore`**: no new tests required (modules unchanged);
  existing suites must stay green.
- `bun x tsc --noEmit` (strict) stays clean.

## Verification (not covered by `bun test` — buildless frontend)

Run `loupe browse` on loupe itself:
1. Confirm the file tree lists all tracked files with no change badges/deltas, and the
   top bar reads `… · codebase · N files`.
2. Open several files; confirm whole-file contents render with comment bubbles on every
   line and no empty hunk pills.
3. Add line comments and a file-level comment across multiple files; mark some viewed.
4. Compile; confirm the prompt contains each comment with its code context under
   `## Code Review — codebase — <date>`.
5. Confirm `loupe` (diff mode) still behaves exactly as before (regression check).

## Files touched

| File | Change |
|---|---|
| `src/core/projectScan.ts` | **new** — build all-context `DiffResult` from tracked files |
| `tests/projectScan.test.ts` | **new** — unit tests for the scan/transform |
| `src/utils/cli.ts` | parse `browse [path]` |
| `src/index.ts` | branch to `projectScan` for the `browse` spec |
| `src/server/handlers.ts` | `mode`/`scope` on context; re-scan on refresh in browse mode (watch 200-line cap) |
| `src/client/topBar.js` | browse-mode header, hide delta + split toggle |
| `src/client/fileTree.js` | hide change badges + deltas in browse mode |
| `src/client/diffLines.js` | suppress empty hunk-header pill |
| `tests/cli.test.ts` | extend for `browse` parsing |

Unchanged: `src/types.ts`, `src/core/reviewStore.ts`, `src/core/promptCompiler.ts`,
`src/core/anchor.ts`, `src/core/diffParser.ts`.

## Future (deferred, not in this spec)

- **Lazy loading**: serve the file tree upfront, fetch each file's contents on demand
  (reusing `/api/file`) for large repos. Add if eager scanning gets sluggish.
- **Live LLM integration**: answer questions in-app instead of paste-the-prompt.

## Release

New user-facing feature → minor bump (`0.8.1` → `0.9.0`): update `package.json`, tag
`v0.9.0`, add a `CHANGELOG.md` entry, cut a GitHub release.
