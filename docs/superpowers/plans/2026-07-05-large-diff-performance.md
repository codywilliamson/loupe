# Large-Diff Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make loupe fast and responsive on large diffs (150 files / 40k changed lines currently freezes the tab for minutes and ships 11 MB of uncompressed JSON).

**Architecture:** Three independent fixes: (1) gzip API/static responses at the router choke point; (2) isolate re-renders so interaction state (drag-select, comment editor) only re-renders the one affected file section, via per-file prop slicing + `memo`; (3) lazy-mount file bodies with an IntersectionObserver so offscreen files render as height-preserving placeholders, plus a "Load diff" guard for giant files.

**Tech Stack:** Bun server, buildless Preact + htm from esm.sh, `bun test`, strict TS.

## Global Constraints

- No runtime npm dependencies; client stays buildless (CDN ES modules pinned in `src/client/preact.js`).
- No file over 200 lines (soft 150); `src/client/index.html` exempt.
- `src/types.ts` is the single source of truth for shared shapes — never redefine.
- htm has NO `<>...</>` fragment shorthand — return multiple root nodes (array) instead.
- Comments lowercase, minimal. Conventional commits, one concern per commit.
- `bun test` and `bun x tsc --noEmit` must stay green after every task.
- Baseline (repo of 150 files × 400 lines, ~1/3 edited, at `$SCRATCHPAD/bigrepo`): `/api/diff` = 11,020,172 B uncompressed / 1,081,559 B gzipped; browser main thread frozen >90 s on load.

---

### Task 1: gzip compression for server responses

**Files:**
- Create: `src/server/compress.ts`
- Modify: `src/server/router.ts` (wrap `route()` result in `createServer`'s fetch)
- Test: `tests/compress.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `maybeCompress(req: Request, res: Response): Promise<Response>` — returns `res` untouched unless the client accepts gzip, the content type is compressible, and the body is ≥ 1024 bytes.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compress.test.ts
import { describe, expect, test } from "bun:test";
import { gunzipSync } from "bun";
import { maybeCompress } from "../src/server/compress";

const bigJson = JSON.stringify({ data: "x".repeat(5000) });

function jsonResponse(body: string): Response {
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}

function gzipRequest(): Request {
  return new Request("http://localhost/api/diff", { headers: { "Accept-Encoding": "gzip, deflate" } });
}

describe("maybeCompress", () => {
  test("gzips large json when the client accepts gzip", async () => {
    const res = await maybeCompress(gzipRequest(), jsonResponse(bigJson));
    expect(res.headers.get("Content-Encoding")).toBe("gzip");
    expect(res.headers.get("Vary")).toBe("Accept-Encoding");
    const body = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(gunzipSync(body))).toBe(bigJson);
  });

  test("passes through when the client does not accept gzip", async () => {
    const req = new Request("http://localhost/api/diff");
    const res = await maybeCompress(req, jsonResponse(bigJson));
    expect(res.headers.get("Content-Encoding")).toBeNull();
    expect(await res.text()).toBe(bigJson);
  });

  test("passes through small bodies", async () => {
    const res = await maybeCompress(gzipRequest(), jsonResponse("{}"));
    expect(res.headers.get("Content-Encoding")).toBeNull();
  });

  test("passes through non-compressible content types", async () => {
    const png = new Response("x".repeat(5000), { headers: { "Content-Type": "application/octet-stream" } });
    const res = await maybeCompress(gzipRequest(), png);
    expect(res.headers.get("Content-Encoding")).toBeNull();
  });

  test("preserves status codes", async () => {
    const notFound = new Response(bigJson, { status: 404, headers: { "Content-Type": "application/json" } });
    const res = await maybeCompress(gzipRequest(), notFound);
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Encoding")).toBe("gzip");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/compress.test.ts`
Expected: FAIL — cannot resolve `../src/server/compress`.

- [ ] **Step 3: Write the implementation**

```ts
// src/server/compress.ts
// gzips a response at the router choke point when the client accepts it.
// large diffs are ~10x smaller gzipped; tiny/binary bodies pass through untouched.

import { gzipSync } from "bun";

const MIN_COMPRESS_BYTES = 1024;
const COMPRESSIBLE = /^(application\/json|text\/)/;

export async function maybeCompress(req: Request, res: Response): Promise<Response> {
  const accepts = req.headers.get("Accept-Encoding") ?? "";
  if (!accepts.includes("gzip")) return res;
  if (!COMPRESSIBLE.test(res.headers.get("Content-Type") ?? "")) return res;

  const body = new Uint8Array(await res.arrayBuffer());
  if (body.byteLength < MIN_COMPRESS_BYTES) {
    return new Response(body, { status: res.status, headers: res.headers });
  }
  const headers = new Headers(res.headers);
  headers.set("Content-Encoding", "gzip");
  headers.set("Vary", "Accept-Encoding");
  return new Response(gzipSync(body), { status: res.status, headers });
}
```

Note: once `res.arrayBuffer()` is consumed the original body is gone, so the small-body branch must rebuild the Response from the read bytes (as shown), never return `res`.

In `src/server/router.ts`, change `createServer` to route through it:

```ts
import { maybeCompress } from "./compress";

export function createServer(ctx: ServerContext, port = 0): Server<undefined> {
  return Bun.serve({
    port,
    fetch: async (req) => maybeCompress(req, await route(ctx, req)),
  });
}
```

- [ ] **Step 4: Run the full checks**

Run: `bun test && bun x tsc --noEmit`
Expected: all tests PASS (existing router tests exercise `createServer` — they must stay green), tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/compress.ts src/server/router.ts tests/compress.test.ts
git commit -m "feat(server): gzip api and static responses"
```

---

### Task 2: isolate re-renders to the affected file section

**Files:**
- Create: `src/client/threads.js` (makeThreads moves here, adapted to pre-scoped props)
- Modify: `src/client/preact.js` (export `memo` from preact/compat)
- Modify: `src/client/diffView.js` (per-file prop slicing, `memo(FileSection)`, drop makeThreads)
- Modify: `src/client/app.js` (precompute comment counts map)
- Modify: `src/client/diffLines.js` (rAF-throttle the drag-select mousemove)

**Interfaces:**
- Consumes: existing `useComments` handlers, `adding`/`selecting` state shapes from app.js.
- Produces: `makeThreads(file, ctx)` in `/threads.js` where `ctx = { fileComments, adding, selecting, setAdding, setSelecting, onAdd, onEdit, onDelete, onResolve }` — `fileComments` is ALREADY filtered to this file, `adding`/`selecting` are ALREADY null unless they target this file. The returned controller object keeps the exact same method surface the row components already use (`commentsForFile`, `commentsForLine`, `rangeAt`, `pendingAt`, `isAddingAt`, `addingFile`, `onSelectMove`, `onSelectCommit`, `onExtendAdd`, `onStartFileAdd`, `onCancelAdd`, `onAdd`, `onAddFile`, `onEdit`, `onDelete`, `onResolve`).

Why this shape: `memo` needs shallow-stable props. When a drag-select fires `setSelecting` 60×/s, only the file whose `selecting` prop flipped from `null` re-renders; the other 149 sections skip.

- [ ] **Step 1: Add `memo` to the preact shim**

In `src/client/preact.js` add (keeping the single-pin rule — esm.sh resolves compat's internal preact import to the same pinned URL, so instances are shared):

```js
import { memo } from "https://esm.sh/preact@10.23.2/compat";
export { memo };
```

- [ ] **Step 2: Create `src/client/threads.js`**

Move `makeThreads`, `endOf`, `sideOf`, `rawLine` out of diffView.js verbatim, then adapt to the pre-scoped ctx: replace `comments.filter((c) => c.file === file.path && ...)` with `fileComments.filter((c) => ...)`, replace `adding && adding.file === file.path` with `adding != null`, replace `selecting && selecting.file === file.path ? selecting : null` with just `selecting`. Everything else (the anchor math, the setAdding/setSelecting payloads — which still carry `file: file.path`) stays identical.

- [ ] **Step 3: Rewire `src/client/diffView.js`**

- `FileSection` becomes the memoized export: `const FileSection = memo(FileSectionImpl)`.
- `FileSectionImpl` receives `{ file, splitView, browse, wrap, fileComments, adding, selecting, setAdding, setSelecting, onAdd, onEdit, onDelete, onResolve }` and builds `threads = makeThreads(file, { fileComments, adding, selecting, setAdding, setSelecting, onAdd, onEdit, onDelete, onResolve })` inline (cheap — closures only).
- `DiffView` slices per file:

```js
const EMPTY = [];
export function DiffView({ files, viewMode, activeFile, splitView, browse, wrap, comments, adding, setAdding, selecting, setSelecting, onAdd, onEdit, onDelete, onResolve }) {
  // group once per comments change so untouched files keep an identical array prop
  const byFile = useMemo(() => {
    const m = new Map();
    for (const c of comments) {
      const list = m.get(c.file);
      list ? list.push(c) : m.set(c.file, [c]);
    }
    return m;
  }, [comments]);
  const shown = viewMode === "single" ? [files.find((f) => f.path === activeFile) ?? files[0]].filter(Boolean) : files;
  return html`<main class="diff-pane ${wrap ? "wrap" : ""}">
    ${shown.map(
      (file) => html`<${FileSection}
        key=${file.path}
        file=${file}
        splitView=${splitView}
        browse=${browse}
        wrap=${wrap}
        fileComments=${byFile.get(file.path) ?? EMPTY}
        adding=${adding && adding.file === file.path ? adding : null}
        selecting=${selecting && selecting.file === file.path ? selecting : null}
        setAdding=${setAdding}
        setSelecting=${setSelecting}
        onAdd=${onAdd}
        onEdit=${onEdit}
        onDelete=${onDelete}
        onResolve=${onResolve}
      />`
    )}
  </main>`;
}
```

- [ ] **Step 4: Precompute comment counts in `src/client/app.js`**

Replace the `countFor` filter-per-file with a memoized map:

```js
const countsByFile = useMemo(() => {
  const m = new Map();
  for (const c of comments) if (!c.resolved) m.set(c.file, (m.get(c.file) ?? 0) + 1);
  return m;
}, [comments]);
const countFor = useCallback((path) => countsByFile.get(path) ?? 0, [countsByFile]);
```

- [ ] **Step 5: rAF-throttle drag-select in `src/client/diffLines.js`**

In `startSelect`, wrap the mousemove work so at most one state update lands per frame, and skip no-op moves:

```js
let raf = 0;
let lastXY = null;
const move = (ev) => {
  lastXY = [ev.clientX, ev.clientY];
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const row = document.elementFromPoint(lastXY[0], lastXY[1])?.closest("tr.diff-row");
    const n = row && section.contains(row) ? row.dataset[attr] : "";
    if (n && Number(n) !== head) {
      head = Number(n);
      threads.onSelectMove(side, anchor, head);
    }
  });
};
```

`stop` must also `cancelAnimationFrame(raf)`.

- [ ] **Step 6: Verify**

Run: `bun test && bun x tsc --noEmit` → green. Then real-browser check (playwright) on the loupe repo's own diff: comment add/edit/delete/resolve, drag-select a range, shift-click extend, file-level comment, per-file split toggle, viewed checkbox — all must behave exactly as before.

- [ ] **Step 7: Commit**

```bash
git add src/client/threads.js src/client/preact.js src/client/diffView.js src/client/app.js src/client/diffLines.js
git commit -m "refactor(ui): isolate interaction re-renders to the touched file section"
```

---

### Task 3: lazy-mount file bodies + giant-file guard

**Files:**
- Create: `src/client/lazySection.js`
- Modify: `src/client/util.js` (add pure `lineCountOf`, `estimatedHeight`)
- Modify: `src/client/diffView.js` (wrap the file body in `LazyMount`, add the guard)
- Modify: `src/client/diff.css` (placeholder styling)
- Test: `tests/util.test.ts` (new — pure helpers)

**Interfaces:**
- Consumes: `file.hunks[].lines` shape from `src/types.ts`; `adding`/`selecting` pre-scoped props from Task 2.
- Produces:
  - `lineCountOf(file): number` and `estimatedHeight(file): number` in `/util.js` (pure, no dom).
  - `LazyMount({ estimate, keepMounted, children })` in `/lazySection.js` — renders `children` only while near the viewport (IntersectionObserver, generous rootMargin); otherwise a fixed-height placeholder. Remembers the real height (from the observer entry's boundingClientRect) when unmounting so scroll position never jumps. `keepMounted` pins it mounted (open editor / active drag).

- [ ] **Step 1: Write failing tests for the pure helpers**

```ts
// tests/util.test.ts
import { describe, expect, test } from "bun:test";
// @ts-expect-error — buildless client module, no types
import { lineCountOf, estimatedHeight, ROW_HEIGHT } from "../src/client/util.js";

const file = (counts: number[]) => ({
  hunks: counts.map((n) => ({ header: "@@", lines: Array.from({ length: n }, () => ({})) })),
});

describe("lineCountOf", () => {
  test("sums lines across hunks", () => {
    expect(lineCountOf(file([3, 4]))).toBe(7);
  });
  test("zero for no hunks (binary)", () => {
    expect(lineCountOf(file([]))).toBe(0);
  });
});

describe("estimatedHeight", () => {
  test("scales with line count plus a hunk header row per hunk", () => {
    expect(estimatedHeight(file([10]))).toBe(11 * ROW_HEIGHT);
  });
  test("has a floor for empty files", () => {
    expect(estimatedHeight(file([]))).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test tests/util.test.ts`
Expected: FAIL — `lineCountOf` not exported.

- [ ] **Step 3: Add helpers to `src/client/util.js`**

```js
// diff rows render at a known height; used to size lazy placeholders.
export const ROW_HEIGHT = 24;

export function lineCountOf(file) {
  let n = 0;
  for (const h of file.hunks) n += h.lines.length;
  return n;
}

// placeholder height for an unmounted file body: one row per line + one per hunk header.
export function estimatedHeight(file) {
  return Math.max((lineCountOf(file) + file.hunks.length) * ROW_HEIGHT, ROW_HEIGHT);
}
```

Check the real row height in `diff.css` first and set `ROW_HEIGHT` to match (approximate is fine — the placeholder self-corrects once mounted).

- [ ] **Step 4: Create `src/client/lazySection.js`**

```js
// mounts heavy file bodies only near the viewport. far-away sections render a
// height-preserving placeholder, so a 150-file diff paints instantly and the
// scrollbar stays stable as sections mount/unmount.
import { html, useState, useRef, useEffect } from "/preact.js";

const NEAR_MARGIN = "1200px 0px"; // pre-mount roughly a screen ahead in each direction

export function LazyMount({ estimate, keepMounted, children }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  const height = useRef(estimate);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // record the real height on the way out so the placeholder matches
        if (!entry.isIntersecting && entry.boundingClientRect.height > 0) {
          height.current = entry.boundingClientRect.height;
        }
        setNear(entry.isIntersecting);
      },
      { rootMargin: NEAR_MARGIN }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const mounted = near || keepMounted;
  return html`<div ref=${ref} class="lazy-body" style=${mounted ? "" : `height:${height.current}px`}>
    ${mounted ? children : null}
  </div>`;
}
```

- [ ] **Step 5: Wire into `FileSectionImpl` in `src/client/diffView.js`**

- Compute `const lines = lineCountOf(file)` once.
- Giant-file guard (constant at top of file): `const GIANT_FILE_LINES = 2000;` — when `lines > GIANT_FILE_LINES` and the user hasn't clicked through, the body renders a note instead of the diff:

```js
const [forceShow, setForceShow] = useState(false);
const giant = lines > GIANT_FILE_LINES && !forceShow;
```

```js
${giant
  ? html`<div class="giant-note">
      Large diff (${lines.toLocaleString()} lines) — hidden to keep things fast.
      <button class="btn-toggle" onClick=${() => setForceShow(true)}>Load diff</button>
    </div>`
  : html`<${LazyMount} estimate=${estimatedHeight(file)} keepMounted=${adding != null || selecting != null}>
      ...existing table / markdown / binary body...
    </${LazyMount}>`}
```

- The file-comments block (`fileComments` / editor) stays OUTSIDE LazyMount so file-level threads are always visible.
- Markdown preview + binary notes are cheap — keep them inside LazyMount anyway (uniform path) EXCEPT: `MarkdownView` fetches on mount; unmount/remount refetches. Acceptable (localhost), keep uniform.
- Comment editors and drag-selects pin the body via `keepMounted`, so typing state can't be destroyed by scrolling away.
- If diffView.js crosses 200 lines, move `FileHeader` into `src/client/fileHeader.js`.

- [ ] **Step 6: Placeholder + note styling in `src/client/diff.css`**

```css
/* lazy body placeholders keep layout stable while offscreen */
.lazy-body:empty {
  background: repeating-linear-gradient(transparent 0 23px, var(--border, #8882) 23px 24px);
  opacity: 0.35;
}
.giant-note {
  padding: 24px 16px;
  color: var(--fg-muted, #888);
  display: flex;
  gap: 12px;
  align-items: center;
}
```

(Match the variable names actually used in the existing css — check `styles.css`/`theme.css` for the real custom property names before using them.)

- [ ] **Step 7: Verify**

Run: `bun test && bun x tsc --noEmit` → green.
Browser check on `$SCRATCHPAD/bigrepo` (150 files): page interactive in ~1–2 s, scroll is smooth, sections mount as you approach them, scrollbar doesn't jump wildly, file-tree click scrolls to the right section, viewed/collapse/split still work, comments still add/edit everywhere including in a freshly-mounted section.

- [ ] **Step 8: Commit**

```bash
git add src/client/lazySection.js src/client/util.js src/client/diffView.js src/client/diff.css tests/util.test.ts
git commit -m "feat(ui): lazy-mount file bodies and guard giant files behind load-diff"
```

---

### Task 4: perceived-speed polish (CDN preload hints)

**Files:**
- Modify: `src/client/index.html`

**Interfaces:** none.

- [ ] **Step 1: Add preconnect + modulepreload hints in `<head>` (before the stylesheets)**

```html
<link rel="preconnect" href="https://esm.sh" crossorigin />
<link rel="modulepreload" href="https://esm.sh/preact@10.23.2" />
<link rel="modulepreload" href="https://esm.sh/preact@10.23.2/hooks" />
<link rel="modulepreload" href="https://esm.sh/preact@10.23.2/compat" />
<link rel="modulepreload" href="https://esm.sh/htm@3.1.1" />
<link rel="modulepreload" href="https://esm.sh/highlight.js@11.10.0/lib/common" />
```

Versions MUST match the pins in `src/client/preact.js` and `src/client/highlight.js` exactly.

- [ ] **Step 2: Verify + commit**

Reload the app, confirm no console errors and everything renders.

```bash
git add src/client/index.html
git commit -m "perf(ui): preconnect and modulepreload the pinned cdn modules"
```

(Project scope list has no `perf` type — use `feat(ui)`… no: this is not a feature. Use `chore(ui): preload pinned cdn modules` if the reviewer objects; pick `style`? No. Use `refactor`? Simplest honest fit within the allowed types: `chore`.)

---

### Task 5: end-to-end verification + benchmark

- [ ] Run `bun test` (all) and `bun x tsc --noEmit` — green.
- [ ] Restart the server on `$SCRATCHPAD/bigrepo`, measure: `/api/diff` transfer size with `Accept-Encoding: gzip` (expect ~1.1 MB), time-to-interactive in playwright (expect < 3 s vs frozen baseline), DOM node count near load (expect ~10× smaller), drag-select smoothness.
- [ ] Run loupe on its own repo diff and click through every interaction listed in Task 2 Step 6.
- [ ] Update CHANGELOG.md `## [Unreleased]`, then release per docs (minor bump → 0.10.0, tag, GitHub release).
