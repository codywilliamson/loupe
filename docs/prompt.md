# Build: `loupe` — Local ADO-Style Code Review Tool

---

## Agent Instructions

Work **fully autonomously**. Do not ask clarifying questions — make a reasonable decision, document it in a code comment or commit message, and move on. If you encounter a genuine ambiguity that would require a fundamentally different architecture, pick the simpler path.

**Before writing any code:**

1. Output a concise numbered build plan (phases, not tasks) covering repo setup, contracts, server, parser, UI, tests
2. Execute the plan top-to-bottom
3. After each phase, verify it works before moving to the next

Conventionally commit frequently. Every logical unit of work gets its own commit. Never batch unrelated changes.

---

## Execution Strategy

Produce the numbered build plan first (phases, not tasks). Work it top to bottom, verifying each phase runs before starting the next.

Establish shared contracts before parallelizing anything. The diff JSON shape, the `.review` schema, and the API request/response types are the source of truth every module depends on. Define them as TypeScript types in `src/types.ts` in the main thread, commit them (`chore: define core types and contracts`), then build against them. Nothing downstream redefines these.

Use sub-agents to save context and parallelize, but only for independently testable units whose contract is already pinned. Good candidates:

- one sub-agent per core module plus its test file: `diffParser`, `promptCompiler`, `reviewStore`. These are near-pure and verifiable in isolation.
- one sub-agent for the server layer (`router` + `handlers`) once the API contract is fixed.
- one sub-agent for the frontend.

Sub-agents do not share memory. Hand each one everything it needs up front: the relevant types from `src/types.ts`, the engineering standards (file size, naming, DRY/SRP), the commit conventions, and its specific test requirements. Do not assume a sub-agent can see decisions made elsewhere.

The main agent owns integration, all commits, and final verification: run the full suite, then an end-to-end smoke test (launch on a real diff, add a comment, compile the prompt) before declaring done.

---

## Project Bootstrap

```bash
gh repo create loupe \
  --public \
  --description "Local git diff viewer with ADO-style UI, inline comments, and LLM prompt export" \
  --clone

cd loupe
bun init -y
```

`bun init` scaffolds `package.json`, `tsconfig.json`, and an entry file. Set the package `name` to `loupe`, `version` to `0.1.0`, and `description` to match the repo. Move the entry point to `src/index.ts`.

Then immediately create:

- `README.md` — see spec below
- `.gitignore` — node_modules, .review, .env
- `package.json` — filled out correctly with a `start` script (see Stack)
- `src/types.ts` — the shared contracts (see Execution Strategy)

Commit: `chore: initialize project`

### README

Concise. No fluff. Four sections only:

```markdown
# loupe

Local git diff viewer with an ADO-style UI. Leave inline comments, then export them as a structured prompt for any LLM.

## Install

    bun install

## Usage

    bun src/index.ts                  # working tree vs HEAD
    bun src/index.ts staged           # staged changes only
    bun src/index.ts <branch>         # current branch vs named branch
    bun src/index.ts <ref1>..<ref2>   # commit range

## Comments

Saved to `.review` in the directory you run the command from (auto-added to `.gitignore`).
```

### Semantic Versioning

Start at `0.1.0`. Follow semver strictly:

- Patch bump (`0.1.x`): bug fixes, test additions, refactors with no behavior change
- Minor bump (`0.x.0`): new user-facing feature
- Major bump will not occur in this project below `1.0.0`

Update `package.json` version on any minor bump. Tag releases: `git tag v0.x.0`.

Nice to have: build a release script or actions workflow.

---

## Conventional Commits

Every commit message follows this format:

```
<type>(<scope>): <short description>
```

**Types:**

|Type|When|
|---|---|
|`feat`|New user-facing feature|
|`fix`|Bug fix|
|`test`|Adding or updating tests|
|`refactor`|Code change with no behavior change|
|`chore`|Config, deps, tooling, CI|
|`docs`|README or comment changes only|
|`style`|Formatting, whitespace (rare)|

**Scopes (use these):** `parser`, `server`, `ui`, `store`, `compiler`, `cli`, `types`, `tests`

Examples:

- `feat(ui): add collapsible file sections`
- `fix(parser): handle binary file entries in diff output`
- `test(compiler): add edge cases for file-level comments`
- `chore: add bun test config`

---

## Engineering Standards

### DRY

Extract any logic used more than once. No copy-pasted blocks. Shared utilities live in `src/utils/`.

### SRP

Each module does one thing. If you find yourself writing "and" to describe what a file does, split it.

### KISS

Prefer the obvious solution. No clever abstractions until the simple version provably needs replacing.

### YAGNI

Build exactly what the spec describes. No extension points, plugin systems, config files, or "future-proofing" that isn't needed now.

### Types

All `.ts` source compiles cleanly under the `tsconfig.json` bun generates (strict mode on). The diff JSON shape, `.review` schema, and API request/response bodies are defined once in `src/types.ts` and imported everywhere. No `any` on the contract types. No re-declaring a shape that already exists in `src/types.ts`.

### File Size

- **Soft limit: 150 lines.** If a file approaches this, look for a clean split.
- **Hard limit: 200 lines.** No file may exceed this. No exceptions.
- Comments and blank lines count toward the limit.
- `src/client/index.html` is exempt from the line limit, but it should stay thin: markup plus a small bootstrap `<script type="module">` that imports the client modules. The client `.js` modules in `src/client/` follow the same 150/200 limits as everything else.

### Readability

- Prefer named constants over magic values
- Function names should read like plain English: `parseHunkHeader`, `compileReviewPrompt`, `appendToGitignore`
- No abbreviations except universally understood ones (`req`, `res`, `id`, `fs`, `url`)
- One exported thing per module unless they are trivially related utilities

---

## File Structure

```
loupe/
├── src/
│   ├── index.ts          # CLI entry point — parse args, start server, open browser
│   ├── types.ts          # Shared contracts: diff JSON, .review schema, API bodies
│   ├── server/
│   │   ├── router.ts     # Route definitions (Bun.serve fetch handler / routing)
│   │   ├── handlers.ts   # Route handler functions
│   ├── core/
│   │   ├── diffParser.ts   # Runs git diff, parses unified diff output into JSON
│   │   ├── reviewStore.ts  # Read/write .review file, gitignore handling
│   │   ├── promptCompiler.ts # Assembles comments + context into formatted prompt string
│   ├── utils/
│   │   ├── git.ts        # Shell helpers: runGit(), resolveRef()
│   ├── client/
│   │   ├── index.html    # Markup + module bootstrap (exempt from line limit)
│   │   ├── app.js         # Root Preact component + state
│   │   ├── fileTree.js    # Left sidebar file tree
│   │   ├── diffView.js    # Right pane diff rendering (unified + side-by-side)
│   │   ├── comments.js    # Inline comment cards / threads
│   │   ├── compileModal.js # Compile Review Prompt modal
│   │   ├── api.js         # fetch wrappers for the API
├── tests/
│   ├── diffParser.test.ts
│   ├── reviewStore.test.ts
│   ├── promptCompiler.test.ts
│   ├── router.test.ts
│   ├── fixtures/
│   │   ├── sample.diff         # Raw git diff output for parser tests
│   │   ├── sample.review.json  # Example .review file for store tests
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

Port selection needs no utility module: `Bun.serve({ port: 0 })` binds a free port and the chosen port is read back from the returned server object.

The client `.js` split above is a suggestion, not a mandate. Keep modules under the file-size limit and split along the components listed; merge trivially small ones if it reads cleaner.

---

## Testing

### Framework

Use **`bun test`** (built in, no install, no config file needed). Configure scripts in `package.json`:

```json
"scripts": {
  "start": "bun src/index.ts",
  "test": "bun test"
}
```

Import test primitives from `bun:test`:

```ts
import { describe, it, expect } from "bun:test";
```

No vitest, no jest, no separate test config.

### Coverage Requirements

|Module|What to test|
|---|---|
|`diffParser`|Parses added/deleted/renamed/binary files; correctly tracks old and new line numbers across hunks; handles empty diffs; handles diffs with no newline at EOF|
|`promptCompiler`|Correct context window (2 lines above/below); correct `>` prefix on commented lines; file-level comments render without code block; multi-comment same line; alphabetical file sort; summary count is accurate|
|`reviewStore`|Reads existing `.review` correctly; writes and round-trips; appends to `.gitignore` when missing entry; does not duplicate `.gitignore` entry; creates file on first write|
|`router`|All endpoints return correct status codes; `POST /api/comments` persists data; malformed body returns 400|

### Test Style

- One `describe` block per module
- Test names read as sentences: `'returns empty array when diff output is blank'`
- Use fixture files for multi-line input; do not inline large strings in test bodies
- No mocking of the filesystem in `reviewStore` tests — use a temp directory via `os.tmpdir()` (bun supports the node `os`/`fs` APIs)
- Router tests exercise the real `Bun.serve` instance: start it on port 0, `fetch` against it, assert on status and body
- Aim for full branch coverage on `diffParser` and `promptCompiler`; these are pure functions with no side effects

---

## Stack

**Bun** — runtime, server, test runner, and TypeScript execution in one tool. No build step, no transpile config, no separate test framework.

- Server: native `Bun.serve`. Route inside its `fetch` handler (keep routing in `router.ts`, handler bodies in `handlers.ts`).
- TypeScript: bun runs `.ts` directly. `tsconfig.json` from `bun init`, strict mode on. The contract types in `src/types.ts` are what the sub-agents build against so the modules agree on the data shape.
- Tests: `bun test`.
- Port: `Bun.serve({ port: 0 })` for a random free port.

The tool runs with `bun src/index.ts [args]` after `bun install`. That's the only setup. There are no runtime npm dependencies — the server is Bun-native and the frontend pulls everything from CDNs.

Frontend (buildless, loaded in the browser via ES modules and CDN — no install, no bundler):

- **Preact + htm** via `esm.sh` — JSX-like component syntax through tagged template literals, no transpile. Components live in the `src/client/*.js` modules and are imported by the bootstrap script in `index.html`.
- **highlight.js** via CDN — syntax highlighting; language detected from file extension
- **Lucide** icons via CDN — comment bubble, chevron, checkbox icons

---

## CLI Interface

```
bun src/index.ts                    # working tree vs HEAD (staged + unstaged)
bun src/index.ts staged             # staged changes only
bun src/index.ts <branch>           # current branch vs named branch (e.g. origin/main)
bun src/index.ts <ref1>..<ref2>     # arbitrary commit range
```

On launch:

1. Resolve the ref argument and validate it against the local git repo (exit with a clear error message if invalid)
2. Run the appropriate `git diff` command and parse the output
3. Start `Bun.serve` on a random available port (`port: 0`)
4. Auto-open the browser
5. Print `loupe running at http://localhost:<port>` to stdout

---

## API

|Method|Path|Description|
|---|---|---|
|`GET`|`/`|Serve `index.html`|
|`GET`|`/api/diff`|Return parsed diff JSON|
|`GET`|`/api/comments`|Return `.review` file contents (empty object if none)|
|`POST`|`/api/comments`|Full replace of comments array; save to `.review`|
|`POST`|`/api/viewed`|Full replace of viewed array; save to `.review`|

The `src/client/*.js` modules are served as static assets from the same `Bun.serve` instance. All API responses: `Content-Type: application/json`. Errors return `{ "error": "<message>" }` with appropriate status code.

---

## Git Diff Parsing

Parse `git diff` unified output server-side into structured JSON. The output shape below is the canonical `DiffResult` type — define it in `src/types.ts`.

**Output shape:**

```json
{
  "ref": "origin/main",
  "files": [
    {
      "path": "src/components/Foo.tsx",
      "oldPath": null,
      "changeType": "modified",
      "additions": 4,
      "deletions": 2,
      "hunks": [
        {
          "header": "@@ -38,7 +38,9 @@",
          "lines": [
            { "type": "context",  "oldLine": 38, "newLine": 38, "content": "  async function loadData() {" },
            { "type": "deletion", "oldLine": 39, "newLine": null, "content": "  const result = fetch(url)" },
            { "type": "addition", "oldLine": null, "newLine": 39, "content": "  const result = await fetch(url)" },
            { "type": "context",  "oldLine": 40, "newLine": 40, "content": "  }" }
          ]
        }
      ]
    }
  ]
}
```

Change types: `added`, `modified`, `deleted`, `renamed`. For renamed files, `oldPath` is the prior path. Binary files: include in the file list with `"binary": true` and empty `hunks`.

---

## UI Layout — ADO Faithful

Closely replicate the Azure DevOps PR "Files" tab. Do not invent a new design language.

### Colors

|Element|Value|
|---|---|
|Added line bg|`#dff0d4`|
|Added gutter bg|`#acefab`|
|Deleted line bg|`#ffd7d5`|
|Deleted gutter bg|`#ffc1be`|
|Context line bg|`#ffffff`|
|Inline add highlight|`#8fde8f`|
|Inline delete highlight|`#ffaaaa`|
|File header bg|`#f4f4f4`|
|Comment card left border|`#0078d4`|
|Comment card bg|`#f8f8f8`|
|ADO blue (primary action)|`#0078d4`|

### Top Bar

- Left: `loupe` wordmark, active ref string (e.g. `working tree`, `staged`, `feature/x → origin/main`)
- Right: file count, `+N / -N` aggregate delta, **Compile Review Prompt** button (ADO blue)

### Left Sidebar — File Tree

- Files grouped by directory path, folders collapsible
- Per file: filename, change badge (`A`/`M`/`D`/`R`), `+N -N` delta, comment count dot (if any), Viewed checkbox
- Clicking a file scrolls the diff pane to that file's section
- Viewed state and comment counts update live without page reload (Preact state, no full re-render flicker)

### Right Pane — Diff View

- Files top-to-bottom in `git diff` order
- Each file: collapsible header (path, badge, delta, toggle), then hunks
- Default: **unified diff**. Per-file toggle to switch to **side-by-side**
- Line number columns: old (left), new (right); blank where not applicable
- Hunk separators shown as `@@ ... @@` in a muted pill style
- Syntax highlighting via highlight.js; language detected from file extension

### Inline Comments

**Adding:**

- Hover any diff line → speech bubble icon appears in far-left gutter
- Click → inline comment card inserted below the line (no modal)
- Card: auto-resizing textarea, Save and Cancel buttons
- File-level: "Add file comment" button in each file section header

**Viewing:**

- Saved comment cards render inline below their line
- Card: comment text, relative timestamp, Edit and Delete buttons
- Multiple comments per line stack as a thread
- File-level comments render at top of file section, below header

---

## Comment Persistence

Saved to `.review` in the **current working directory**. This shape is the canonical `ReviewFile` type — define it in `src/types.ts`.

```json
{
  "meta": {
    "ref": "origin/main",
    "createdAt": "2026-06-02T14:32:00Z",
    "updatedAt": "2026-06-02T15:10:00Z"
  },
  "viewed": ["src/foo.ts", "src/bar.ts"],
  "comments": [
    {
      "id": "c1",
      "file": "src/components/Foo.tsx",
      "line": 42,
      "lineContent": "+  const result = await fetch(url)",
      "text": "This needs error handling",
      "createdAt": "2026-06-02T14:35:00Z"
    },
    {
      "id": "c2",
      "file": "src/api/client.ts",
      "line": null,
      "lineContent": null,
      "text": "File-level: needs rate limiting before prod",
      "createdAt": "2026-06-02T14:40:00Z"
    }
  ]
}
```

On startup: load existing `.review` if present and merge comments into the rendered UI.

**.gitignore handling:** On first `.review` write, check `.gitignore` in the working directory. If `.review` is not listed, append it and log `[loupe] Added .review to .gitignore` to stdout. Do nothing if no `.gitignore` exists.

---

## Compile Review Prompt

Clicking **Compile Review Prompt** opens a modal with a tall monospace textarea and a **Copy** button. The textarea is pre-selected for easy manual copy fallback.

**Output format** (use 4-space indent for inner code blocks to avoid nested fence collisions):

```
## Code Review — origin/main — 2026-06-02

---

### src/components/Foo.tsx — Line 42

    40 |   async function loadData() {
    41 |   {
  > 42 | +   const result = await fetch(url)
    43 |   }
    44 |

This needs error handling. What happens if the fetch fails?

---

### src/api/client.ts — File-level

File-level: needs rate limiting before prod.

---

### src/utils/bar.ts — Lines 15–16

    13 |   function processItems(items: Item[]) {
    14 |
  > 15 | +   items.forEach(async (item) => {
  > 16 | +     await processItem(item)
    17 |   })
    18 |   }

forEach with async callbacks won't await — use for...of instead.

---

## Summary: 3 comment(s) across 3 file(s)
```

**Compiler rules:**

- 2 lines of context above and below commented line(s), pulled from hunk data
- `>` prefix on commented lines, spaces on context lines (column-aligned)
- Line numbers = new-file line numbers
- File-level comments: no code block, just the comment text under `— File-level` header
- Sort: files alphabetically; within each file, file-level first then by line number ascending
- Multiple comments on the same line: single code block, comments separated by blank line
- Summary count at bottom

---

## Non-Goals

- No Azure DevOps API calls or remote interaction
- No authentication
- No LLM calls — this tool feeds LLMs, it does not use them
- No database
- No build step / bundler
- No multi-user support
- Character-level inline diff highlighting: implement only if it falls naturally out of the parser; skip otherwise