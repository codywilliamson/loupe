# loupe — agent guide

Local git diff viewer with an Azure DevOps-style UI: review a diff, leave inline comments, export them as a structured LLM prompt. Run with `bun src/index.ts`. Full original spec: [`docs/prompt.md`](docs/prompt.md).

## Stack & hard constraints

- **Bun is everything**: server (`Bun.serve`), tests (`bun test`), TypeScript executed directly. No build step, no bundler, no transpile.
- **Frontend is buildless**: Preact + htm + highlight.js loaded from a CDN (esm.sh) as ES modules. No JSX — htm tagged templates (`` html`...` ``).
  - The raw `htm.bind(h)` does **not** support the `<>...</>` fragment shorthand. Return multiple root nodes instead (htm yields an array, Preact renders siblings).
- **No runtime npm dependencies.** Dev-only types (`@types/bun`) are fine. Don't add deps.

## Engineering standards (enforced)

- **File size**: soft 150 lines, **hard 200 — no file may exceed it**. `src/client/index.html` is exempt; the client `.js` modules are not. Split before you hit the cap.
- **DRY** — extract anything used twice. Shared helpers in `src/utils/` (server) or `src/client/util.js` (client).
- **SRP** — one job per module. If describing a file needs "and", split it.
- **KISS / YAGNI** — build exactly what's asked. No config systems, plugins, extension points, or future-proofing.
- **Types** — strict TS, no `any` on the contract types.
- **Readability** — named constants over magic values; plain-English function names (`compileReviewPrompt`, `resolveRef`, `appendToGitignore`); comments lowercase, minimal, only when needed.

## The one architectural invariant

`src/types.ts` is the single source of truth for the diff JSON shape, the `.review` schema, and every API request/response body. **Nothing redefines these — import from `src/types.ts`.** When adding a feature that changes a shared shape, change it there first, then build against it.

## Layout

- `src/index.ts` — CLI entry: parse the ref arg → run + parse the diff → serve → open browser.
- `src/core/` — `diffParser`, `promptCompiler`, `reviewStore`. Near-pure, fully unit-tested.
- `src/server/` — `router` + `handlers` (`Bun.serve`). `GET /api/diff` re-runs git diff each call (live refresh).
- `src/utils/git.ts` — `runGit`, `resolveRef`.
- `src/client/` — buildless Preact modules; `src/types.ts` is the shared client/server contract.
- `tests/` — `bun test`, fixtures in `tests/fixtures/`.

## Commits — Conventional Commits

`<type>(<scope>): <short lowercase description>`. Types: `feat` `fix` `test` `refactor` `chore` `docs` `style`. Scopes: `parser` `server` `ui` `store` `compiler` `cli` `types` `tests`. One concern per commit; never batch unrelated changes.

## Testing & verification

- `bun test` — aim for full branch coverage on the pure modules (`diffParser`, `promptCompiler`). Use fixtures for multi-line input; no fs mocking (use temp dirs via `os.tmpdir()`).
- `bun x tsc --noEmit` (strict) must stay clean.
- **Green tests ≠ a working app.** The buildless frontend is not covered by `bun test`. Verify UI changes in a real browser before calling them done. (A `<>` fragment bug once left the entire diff pane blank while all 48 tests passed.)

## Releases

Semver from `0.1.0`. Patch = fixes/refactors/docs; minor = a new user-facing feature → bump `package.json`, tag `vX.Y.Z`, cut a GitHub release. Keep an `## [Unreleased]` section in `CHANGELOG.md`.
