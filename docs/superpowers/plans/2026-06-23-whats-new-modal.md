# "What's New" Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A curated "what's new" modal that auto-pops once per new loupe version and is reopenable from a top-bar button + `n` shortcut.

**Architecture:** Client-only. Curated highlights live in a dependency-free `whatsNew.js` (unit-tested selectors). A `useWhatsNew` hook tracks the last-seen version in `localStorage` and auto-opens when the running version (from `useUpdateCheck`'s `UpdateStatus.current`) has unseen highlights. The modal renders at the app root like `help`/`compile`. The comment state/CRUD is extracted from `app.js` into a `useComments` hook to make room under the 200-line cap.

**Tech Stack:** Bun + `bun test`; buildless Preact + htm (client `.js` modules, excluded from tsc). No new deps, no server changes.

Reference spec: [`docs/superpowers/specs/2026-06-23-whats-new-modal-design.md`](../specs/2026-06-23-whats-new-modal-design.md).

---

## File structure

| File | Responsibility |
|---|---|
| `src/client/whatsNew.js` | **new** — `WHATS_NEW` data + `whatsNewFor` + `shouldAutoShow` (no imports → unit-testable) |
| `tests/whatsNew.test.ts` | **new** — unit tests for the selectors |
| `src/client/useComments.js` | **new** — extracted comment state + CRUD (the app.js trim) |
| `src/client/whatsNewModal.js` | **new** — `useWhatsNew` hook + `WhatsNewModal` component |
| `src/client/app.js` | use `useComments` + `useWhatsNew`; render modal; wire TopBar prop, shortcut, closeOverlays |
| `src/client/topBar.js` | `onWhatsNew` prop + Sparkles button |
| `src/client/icons.js` | add `Sparkles` icon |
| `src/client/shortcuts.js` | `["n", "What's new"]` + `n` handler |
| `src/client/styles.css` | `.whatsnew-*` modal body styles |
| `CHANGELOG.md` | `[Unreleased]` entry |

Unchanged: server, `src/types.ts`, `prefs.js`, `update.js`.

---

## Task 1: `whatsNew.js` data + selectors

**Files:**
- Create: `src/client/whatsNew.js`
- Test: `tests/whatsNew.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/whatsNew.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { WHATS_NEW, whatsNewFor, shouldAutoShow } from "../src/client/whatsNew.js";

describe("whatsNewFor", () => {
  it("returns the entry for a known version", () => {
    const entry = whatsNewFor("0.9.0");
    expect(entry?.version).toBe("0.9.0");
    expect((entry?.items.length ?? 0) > 0).toBe(true);
  });

  it("returns null for an unknown version", () => {
    expect(whatsNewFor("0.0.1")).toBeNull();
  });

  it("ships every entry with the required shape", () => {
    for (const entry of WHATS_NEW) {
      expect(typeof entry.version).toBe("string");
      expect(typeof entry.date).toBe("string");
      expect(Array.isArray(entry.items)).toBe(true);
      for (const item of entry.items) {
        expect(typeof item.title).toBe("string");
        expect(typeof item.body).toBe("string");
      }
    }
  });
});

describe("shouldAutoShow", () => {
  it("shows when the running version has unseen highlights", () => {
    expect(shouldAutoShow("0.9.0", "")).toBe(true);
    expect(shouldAutoShow("0.9.0", "0.8.1")).toBe(true);
  });

  it("does not show once the version has been seen", () => {
    expect(shouldAutoShow("0.9.0", "0.9.0")).toBe(false);
  });

  it("does not show for a version with no highlights", () => {
    expect(shouldAutoShow("0.8.1", "")).toBe(false);
  });

  it("does not show before the version is known", () => {
    expect(shouldAutoShow("", "")).toBe(false);
    expect(shouldAutoShow(undefined, "")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/whatsNew.test.ts`
Expected: FAIL — `Cannot find module "../src/client/whatsNew.js"`.

- [ ] **Step 3: Write the implementation**

Create `src/client/whatsNew.js`:

```js
// curated "what's new" highlights, newest first. edit this each release to spotlight features.
// dependency-free (no /preact.js import) so the selectors are unit-testable under bun test.

export const WHATS_NEW = [
  {
    version: "0.9.0",
    date: "2026-06-23",
    items: [
      {
        title: "Codebase browse mode",
        body: "Run loupe browse to review the whole codebase — not just a diff. Read any file, leave inline questions, and compile them into a prompt to onboard an LLM (or yourself).",
      },
      {
        title: "What's new, in-app",
        body: "This modal — loupe now greets you with the highlights after each update.",
      },
    ],
  },
];

// the curated entry for an exact version, or null.
export function whatsNewFor(version) {
  return WHATS_NEW.find((entry) => entry.version === version) ?? null;
}

// auto-show only when running a version that has highlights you haven't seen yet.
export function shouldAutoShow(current, seen) {
  return Boolean(current) && current !== seen && whatsNewFor(current) !== null;
}
```

- [ ] **Step 4: Run the test + typecheck**

Run: `bun test tests/whatsNew.test.ts`
Expected: PASS — all assertions green.

Run: `bun x tsc --noEmit`
Expected: no errors. (If tsc complains about importing the `src/client` `.js`, rename the test to `tests/whatsNew.test.js` — `bun test` still runs it and tsc ignores `.js` without `checkJs`.)

- [ ] **Step 5: Commit**

```bash
git add src/client/whatsNew.js tests/whatsNew.test.ts
git commit -m "feat(ui): add what's-new highlights data and selectors"
```

---

## Task 2: Extract `useComments` from app.js (refactor)

**Files:**
- Create: `src/client/useComments.js`
- Modify: `src/client/app.js`

Behavior-preserving extraction — verified by the existing comment flow, not a new unit test.

- [ ] **Step 1: Create the hook**

Create `src/client/useComments.js`:

```js
// owns the review comments array + its mutations, persisting each change (full-replace
// contract) then trusting local state. extracted from app.js to keep the orchestrator lean.
import { useState, useCallback } from "/preact.js";
import { saveComments } from "/api.js";

export function useComments(onError) {
  const [comments, setComments] = useState([]);

  const persist = useCallback(
    (next) => {
      setComments(next);
      saveComments(next).catch((e) => onError(String(e)));
    },
    [onError]
  );

  const onAdd = useCallback(
    (partial) => persist([...comments, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...partial }]),
    [comments, persist]
  );

  const onEdit = useCallback(
    (id, text, tag) => persist(comments.map((c) => (c.id === id ? { ...c, text, tag } : c))),
    [comments, persist]
  );

  const onDelete = useCallback((id) => persist(comments.filter((c) => c.id !== id)), [comments, persist]);

  // resolve keeps the comment but drops it from the prompt + open counts; toggles back on reopen.
  const onResolve = useCallback(
    (id) => persist(comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))),
    [comments, persist]
  );

  return { comments, setComments, onAdd, onEdit, onDelete, onResolve };
}
```

- [ ] **Step 2: Update the app.js import line**

In `src/client/app.js`, drop `saveComments` (now used only by the hook) and add the hook import. Change:

```js
import { getDiff, getComments, saveComments, saveViewed } from "/api.js";
```
to:
```js
import { getDiff, getComments, saveViewed } from "/api.js";
import { useComments } from "/useComments.js";
```

- [ ] **Step 3: Remove the inline comments state**

In `src/client/app.js`, delete this line (the hook now owns it):

```js
  const [comments, setComments] = useState([]);
```

- [ ] **Step 4: Call the hook after `update`**

In `src/client/app.js`, change:

```js
  const update = useUpdateCheck();
```
to:
```js
  const update = useUpdateCheck();
  const { comments, setComments, onAdd, onEdit, onDelete, onResolve } = useComments(setError);
```

- [ ] **Step 5: Remove the inline comment callbacks**

In `src/client/app.js`, delete this entire block (lines from the `// every mutation persists…` comment through the `onResolve` callback):

```js
  // every mutation persists the full array (full-replace contract), then trusts local state.
  const persistComments = useCallback((next) => {
    setComments(next);
    saveComments(next).catch((e) => setError(String(e)));
  }, []);

  const onAdd = useCallback(
    (partial) => {
      const comment = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...partial };
      persistComments([...comments, comment]);
    },
    [comments, persistComments]
  );

  const onEdit = useCallback(
    (id, text, tag) => persistComments(comments.map((c) => (c.id === id ? { ...c, text, tag } : c))),
    [comments, persistComments]
  );

  const onDelete = useCallback(
    (id) => persistComments(comments.filter((c) => c.id !== id)),
    [comments, persistComments]
  );

  // resolve keeps the comment but drops it from the prompt + open counts; toggles back on reopen.
  const onResolve = useCallback(
    (id) => persistComments(comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))),
    [comments, persistComments]
  );
```

- [ ] **Step 6: Verify (tests, tsc, browser regression)**

Run: `bun test` → Expected: PASS (unchanged count + Task 1's tests).
Run: `bun x tsc --noEmit` → Expected: clean.
Browser: with the loupe-browse preview running, reload, add a comment, edit it, resolve it, delete it — each persists (no console errors). Confirms the extraction is behavior-preserving.

- [ ] **Step 7: Commit**

```bash
git add src/client/useComments.js src/client/app.js
git commit -m "refactor(ui): extract comment state into a useComments hook"
```

---

## Task 3: The what's-new modal + wiring

**Files:**
- Create: `src/client/whatsNewModal.js`
- Modify: `src/client/icons.js`, `src/client/topBar.js`, `src/client/shortcuts.js`, `src/client/app.js`, `src/client/styles.css`

- [ ] **Step 1: Add the Sparkles icon**

In `src/client/icons.js`, add after the `Spark` export:

```js
// sparkles — the "what's new" highlights button (distinct from the claude Spark starburst)
export const Sparkles = () =>
  svg(html`<path
    d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275z"
  /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />`);
```

- [ ] **Step 2: Create the hook + modal**

Create `src/client/whatsNewModal.js`:

```js
// "what's new" highlights: the auto-pop trigger hook + the modal. mirrors update.js's
// hook+component shape. content comes from whatsNew.js; the version comes from /api/update.
import { html, useState, useEffect } from "/preact.js";
import { usePersistedState } from "/prefs.js";
import { WHATS_NEW, whatsNewFor, shouldAutoShow } from "/whatsNew.js";
import { X } from "/icons.js";

// owns the seen-version + open state. auto-opens once per new version; reopen() is manual.
export function useWhatsNew(current) {
  const [seen, setSeen] = usePersistedState("loupe-seen-version", "");
  const [open, setOpen] = useState(false);
  // running version's entry, else the newest, so the manual button always has content.
  const entry = (current && whatsNewFor(current)) || WHATS_NEW[0] || null;
  useEffect(() => {
    if (shouldAutoShow(current, seen)) setOpen(true);
  }, [current, seen]);
  const close = () => {
    setOpen(false);
    if (current) setSeen(current);
  };
  return { entry, open, close, reopen: () => setOpen(true) };
}

export function WhatsNewModal({ entry, onClose }) {
  if (!entry) return null;
  return html`<div class="modal-backdrop" onClick=${onClose}>
    <div class="modal whatsnew-modal" onClick=${(e) => e.stopPropagation()}>
      <header class="modal-head">
        <h2>What's new in loupe ${entry.version}</h2>
        <button class="btn-icon" title="Close" onClick=${onClose}><${X} /></button>
      </header>
      <div class="whatsnew-body">
        ${entry.date && html`<div class="whatsnew-date">${entry.date}</div>`}
        <ul class="whatsnew-list">
          ${entry.items.map(
            (item) => html`<li class="whatsnew-item" key=${item.title}>
              <span class="whatsnew-item-title">${item.title}</span>
              <span class="whatsnew-item-body">${item.body}</span>
            </li>`
          )}
        </ul>
      </div>
      <footer class="modal-foot">
        <button class="btn-primary" onClick=${onClose}>Got it</button>
      </footer>
    </div>
  </div>`;
}
```

- [ ] **Step 3: Style the modal body**

In `src/client/styles.css`, add after the `.modal-foot` rule (line ~194):

```css
.whatsnew-body { padding: 14px 16px; overflow: auto; }
.whatsnew-date { color: var(--muted); font-size: 12px; margin-bottom: 12px; }
.whatsnew-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.whatsnew-item { display: flex; flex-direction: column; gap: 3px; }
.whatsnew-item-title { font-weight: 600; font-size: 14px; }
.whatsnew-item-body { color: var(--muted); font-size: 13px; line-height: 1.5; }
```

- [ ] **Step 4: Add the top-bar button**

In `src/client/topBar.js`, add `Sparkles` to the icons import:

```js
import { Sun, Moon, Spark, Refresh, Columns, File, HelpCircle, Sparkles } from "/icons.js";
```

Add `onWhatsNew` to the `TopBar` props destructure (alongside `onHelp`):

```js
  onCompile,
  onHelp,
  onWhatsNew,
}) {
```

Add the button just before the Help button (the one rendering `<${HelpCircle} />`):

```js
      <button class="btn-icon icon-btn" data-tip="What's new" aria-label="What's new" onClick=${onWhatsNew}>
        <${Sparkles} />
      </button>
```

- [ ] **Step 5: Wire the keyboard shortcut**

In `src/client/shortcuts.js`, add to the `SHORTCUTS` array after the `["c", …]` entry:

```js
  ["c", "Compile review prompt"],
  ["n", "What's new"],
```

In `useShortcuts`, add the handler before the `"?"` branch:

```js
      else if (e.key === "c") c.compile();
      else if (e.key === "n") c.whatsNew();
      else if (e.key === "?") c.toggleHelp();
```

- [ ] **Step 6: Wire it into app.js**

In `src/client/app.js`, add the import after the `HelpOverlay` import:

```js
import { HelpOverlay } from "/helpOverlay.js";
import { useWhatsNew, WhatsNewModal } from "/whatsNewModal.js";
```

Call the hook right after the `useComments` line:

```js
  const { comments, setComments, onAdd, onEdit, onDelete, onResolve } = useComments(setError);
  const wn = useWhatsNew(update?.current);
```

In the `useShortcuts({ … })` config, add `whatsNew` and close it in `closeOverlays`:

```js
    compile: () => setShowCompile(true),
    whatsNew: wn.reopen,
    toggleHelp: () => setShowHelp((v) => !v),
    closeOverlays: () => {
      setShowHelp(false);
      setShowCompile(false);
      setAdding(null);
      wn.close();
    },
```

Pass the prop to `TopBar` (after `onHelp`):

```js
      onCompile=${() => setShowCompile(true)}
      onHelp=${() => setShowHelp(true)}
      onWhatsNew=${wn.reopen}
    />
```

Render the modal next to the other overlays (after the `HelpOverlay` line):

```js
    ${showHelp && html`<${HelpOverlay} onClose=${() => setShowHelp(false)} />`}
    ${wn.open && html`<${WhatsNewModal} entry=${wn.entry} onClose=${wn.close} />`}
```

- [ ] **Step 7: Verify the build is clean**

Run: `bun test` → Expected: PASS (no regressions).
Run: `bun x tsc --noEmit` → Expected: clean.
Confirm `src/client/app.js` line count is comfortably under 200:
Run: `bun -e "console.log(require('fs').readFileSync('src/client/app.js','utf8').split('\n').length)"` → Expected: ~174.

- [ ] **Step 8: Commit**

```bash
git add src/client/whatsNewModal.js src/client/icons.js src/client/topBar.js src/client/shortcuts.js src/client/app.js src/client/styles.css
git commit -m "feat(ui): add a what's-new modal with auto-pop and a top-bar button"
```

---

## Task 4: Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the Unreleased entry**

In `CHANGELOG.md`, under the existing `## [Unreleased]` → `### Added` (the browse-mode entry is already there), append a bullet:

```markdown
- **"What's new" modal** — on the first run of a new version, loupe pops a curated highlights modal; reopen it anytime from the top-bar sparkles button or the `n` shortcut.
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: note the what's-new modal in the changelog"
```

---

## Task 5: Full verification

- [ ] **Step 1: Tests + typecheck**

Run: `bun test` → Expected: all green (existing + `whatsNew`).
Run: `bun x tsc --noEmit` → Expected: clean.

- [ ] **Step 2: Browser — manual open + content + close paths**

With the loupe-browse preview running (restart it to pick up server-independent client changes — client `.js`/`.css` are re-read per request, so a reload suffices):
1. Click the top-bar sparkles button → modal shows "What's new in loupe 0.9.0", the date, and both highlight items (title + body).
2. Press `n` → opens it; the `?` overlay now lists `n — What's new`.
3. "Got it", Esc, and clicking the backdrop each close it.

- [ ] **Step 3: Browser — auto-pop + seen persistence**

The running version is 0.8.1 (no 0.9.0 match), so auto-pop won't fire normally. Exercise the auto path with a temporary entry:
1. Temporarily prepend `{ version: "0.8.1", date: "2026-06-23", items: [{ title: "t", body: "b" }] }` to `WHATS_NEW` in `src/client/whatsNew.js`.
2. In the browser: `localStorage.removeItem("loupe-seen-version")`, then reload → modal auto-opens.
3. Close it → eval `localStorage.getItem("loupe-seen-version")` → equals `"0.8.1"`. Reload → it does **not** re-pop.
4. **Remove the temporary entry** so `WHATS_NEW` again starts at `0.9.0`; reload → no auto-pop on 0.8.1 (correct — it'll auto-pop once `package.json` is 0.9.0).

- [ ] **Step 4: Browser — comment regression (useComments)**

Add, edit, resolve, and delete a comment; confirm each persists and no console errors — the `useComments` extraction is behavior-preserving. Clean up any test `.review` afterward.

- [ ] **Step 5: Report**

Summarize tests/tsc output, what the browser checks showed, the final `app.js` line count, and any decisions made.

---

## Self-review notes

- **Spec coverage:** curated data + selectors (Task 1), `useComments` trim (Task 2), `useWhatsNew` + modal + Sparkles button + `n` shortcut + app wiring (Task 3), changelog (Task 4), unit + browser verification incl. auto-pop/seen + comment regression (Tasks 1, 5). Bundled into 0.9.0; seeded entry is 0.9.0; no version bump (deferred to release).
- **Type/name consistency:** `useComments(onError)` returns `{ comments, setComments, onAdd, onEdit, onDelete, onResolve }` — matches app.js destructure (Task 2) and the props passed to `DiffView`/`CompileModal` (unchanged). `useWhatsNew(current)` returns `{ entry, open, close, reopen }` — `reopen` wired to TopBar `onWhatsNew` and shortcut `whatsNew`; `close` used by the modal `onClose` and `closeOverlays` (Task 3). `shouldAutoShow`/`whatsNewFor` signatures match between `whatsNew.js` and `whatsNewModal.js`.
- **No placeholders:** every code step is complete; commands have expected output. The only intentionally-temporary code is the Task 5 auto-pop test entry, explicitly removed in the same step.
