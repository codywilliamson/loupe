# "What's New" Modal — Design

> Status: approved design, ready for implementation planning.
> Date: 2026-06-23

## Summary

A curated "what's new" modal that auto-pops the first time loupe runs a new version,
spotlighting hand-picked highlights for that release. Reopenable anytime from a top-bar
button (and a keyboard shortcut). Entirely client-side — no server changes, no new deps.

Bundled with the 0.9.0 release (alongside codebase browse mode); the seeded entry is for
0.9.0, so it auto-pops when 0.9.0 runs.

## Goal & non-goals

**Goal:** spotlight curated release highlights once per new version, with the smallest
sensible footprint, and pay down `app.js` (at the 200-line cap) while adding the feature.

**Non-goals (v1):**
- No server endpoint, no CHANGELOG.md parsing (highlights are hand-curated).
- No cumulative multi-version display — the modal shows the running version's entry only.
- No markdown in highlight bodies (plain text).
- No live LLM / unrelated work.

## Architecture

Client-only. The installed version is already available to the client via
`useUpdateCheck()` → `UpdateStatus.current`. A `usePersistedState` value records the
last-shown version, so "first run of a new version" needs no server support.

The modal lives at the **app root** (consistent with the `help`/`compile` modals: Esc via
the existing `closeOverlays`, opened from `app.js` state). Adding it plus extracting
`useComments` nets `app.js` to ~184 lines (196 − ~18 extracted + ~6 wiring).

### New: `src/client/whatsNew.js` (data + pure selectors, dependency-free)

No `/preact.js` import, so `bun test` can import it directly.

```js
// curated "what's new" highlights, newest first. edit this each release to spotlight features.
export const WHATS_NEW = [
  { version: "0.9.0", date: "2026-06-23", items: [
    { title: "Codebase browse mode", body: "Run `loupe browse` to review the whole codebase — not just a diff. Read any file, leave inline questions, and compile them into a prompt to onboard an LLM (or yourself)." },
    { title: "What's new, in-app", body: "This modal — loupe now greets you with the highlights after each update." },
  ]},
];

// the curated entry for an exact version, or null.
export function whatsNewFor(version) {
  return WHATS_NEW.find((e) => e.version === version) ?? null;
}

// auto-show only when running a version that has unseen highlights.
export function shouldAutoShow(current, seen) {
  return !!current && current !== seen && whatsNewFor(current) !== null;
}
```

### New: `src/client/whatsNewModal.js` (hook + component, mirrors `update.js`)

- **`useWhatsNew(current)`**:
  - `const [seen, setSeen] = usePersistedState("loupe-seen-version", "")`
  - `const [open, setOpen] = useState(false)`
  - `const entry = (current && whatsNewFor(current)) || WHATS_NEW[0] || null` — what the modal renders (running version's entry, else the newest, so the manual button always has content).
  - effect on `[current, seen]`: `if (shouldAutoShow(current, seen)) setOpen(true)` — only ever opens, never auto-closes.
  - `close()` → `setOpen(false)` and, if `current`, `setSeen(current)` (won't re-pop until the next release).
  - `reopen()` → `setOpen(true)`.
  - returns `{ entry, open, close, reopen }`.
- **`WhatsNewModal({ entry, onClose })`**: standard `.modal-backdrop`/`.modal`/`.modal-head`
  markup. Head: "What's new in loupe `<entry.version>`" with `entry.date` as a muted
  subtitle. Body: the `entry.items` list, each a bold `title` + a `body` line. Footer: a
  single "Got it" button. Backdrop click and "Got it" call `onClose`; Esc is handled by the
  app's `closeOverlays` (which calls `wn.close`), as with the other modals.

### New: `src/client/useComments.js` (the app.js trim)

Extracts the comment state + CRUD currently inline in `app.js`. Cohesive single
responsibility; relocated verbatim so behavior is unchanged.

```js
import { useState, useCallback } from "/preact.js";
import { saveComments } from "/api.js";

// owns the review comments array + the mutations, persisting each change (full-replace contract).
export function useComments(onError) {
  const [comments, setComments] = useState([]);
  const persist = useCallback((next) => {
    setComments(next);
    saveComments(next).catch((e) => onError(String(e)));
  }, [onError]);
  const onAdd = useCallback(
    (partial) => persist([...comments, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...partial }]),
    [comments, persist]
  );
  const onEdit = useCallback((id, text, tag) => persist(comments.map((c) => (c.id === id ? { ...c, text, tag } : c))), [comments, persist]);
  const onDelete = useCallback((id) => persist(comments.filter((c) => c.id !== id)), [comments, persist]);
  const onResolve = useCallback((id) => persist(comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))), [comments, persist]);
  return { comments, setComments, onAdd, onEdit, onDelete, onResolve };
}
```

`app.js` keeps the combined initial load and seeds via the hook's `setComments`:
`Promise.all([getDiff(), getComments()]).then(([d, review]) => { setDiff(d); setComments(review.comments); setViewed(review.viewed); })`.

### Modified: `src/client/app.js`
- Replace the inline comment state/callbacks with `const { comments, setComments, onAdd, onEdit, onDelete, onResolve } = useComments(setError);`.
- `const wn = useWhatsNew(update?.current);` (`update` is the existing `useUpdateCheck()` result).
- Pass `onWhatsNew=${wn.reopen}` to `TopBar`.
- Add `whatsNew: wn.reopen` to the `useShortcuts({...})` config, and `wn.close()` inside `closeOverlays`.
- Render at root: `${wn.open && html\`<${WhatsNewModal} entry=${wn.entry} onClose=${wn.close} />\`}`.

### Modified: `src/client/topBar.js`
- New prop `onWhatsNew`. Render a Sparkles icon button in the right-side icon row (next to Help), `data-tip="What's new"`, `onClick=${onWhatsNew}`.

### Modified: `src/client/icons.js`
- Add a `Sparkles` icon (lucide sparkles path), distinct from the existing claude `Spark`.

### Modified: `src/client/shortcuts.js`
- Add `["n", "What's new"]` to `SHORTCUTS` (auto-listed in the `?` help overlay).
- In `useShortcuts`, handle `else if (e.key === "n") c.whatsNew();` and document `whatsNew` in the ctx comment.

## Data flow

1. `useUpdateCheck()` resolves → `update.current` (installed version from `package.json`).
2. `useWhatsNew(update.current)` reads `seen` from `localStorage["loupe-seen-version"]`.
3. If `shouldAutoShow(current, seen)` → modal opens automatically.
4. Close (button / Esc / backdrop) → `seen = current` persisted; won't re-pop until a newer version with an entry.
5. Top-bar button or `n` → `reopen()` shows `entry` regardless of `seen`.

## Testing & verification

- **Unit** (`tests/whatsNew.test.ts`, imports the dependency-free `whatsNew.js`):
  - `whatsNewFor`: returns the entry for a known version; `null` for an unknown one.
  - `shouldAutoShow`: `true` when current has an entry and `seen` differs; `false` when `seen === current`; `false` for a version with no entry; `false` when `current` is empty.
- `bun test` full suite green; `bun x tsc --noEmit` clean.
- **Browser** (buildless UI, not covered by `bun test`):
  - Top-bar Sparkles button and `n` open the modal showing the 0.9.0 highlights; "Got it", Esc, and backdrop all close it.
  - Auto-pop path: with `localStorage["loupe-seen-version"]` cleared and the hook pointed at a version that has an entry, the modal opens on load; after closing, `loupe-seen-version` equals the running version and it does **not** re-pop on reload.
  - Regression after the `useComments` extraction: add / edit / resolve / delete a comment and confirm it persists (the extraction must be behavior-preserving).

## Files touched

| File | Change |
|---|---|
| `src/client/whatsNew.js` | **new** — `WHATS_NEW` data + `whatsNewFor` + `shouldAutoShow` |
| `src/client/whatsNewModal.js` | **new** — `useWhatsNew` hook + `WhatsNewModal` component |
| `src/client/useComments.js` | **new** — extracted comment state + CRUD |
| `tests/whatsNew.test.ts` | **new** — unit tests for the selectors |
| `src/client/app.js` | use `useComments` + `useWhatsNew`; render modal; wire TopBar prop, shortcut, closeOverlays |
| `src/client/topBar.js` | `onWhatsNew` prop + Sparkles button |
| `src/client/icons.js` | add `Sparkles` icon |
| `src/client/shortcuts.js` | `["n", "What's new"]` + `n` handler |

Unchanged: server, `src/types.ts`, `prefs.js`, `update.js`, `compileModal.js`, `helpOverlay.js`.

## Release

Bundled with the pending 0.9.0 release (codebase browse mode). The seeded `WHATS_NEW`
entry is `0.9.0`, so it auto-pops once `package.json` is at `0.9.0`. Add a one-line
`CHANGELOG.md` `[Unreleased]` entry. No separate version bump.

## Future (deferred)

- Cumulative highlights when several versions are skipped.
- Markdown/inline-code formatting in highlight bodies.
- Sourcing or cross-checking highlights against `CHANGELOG.md`.
