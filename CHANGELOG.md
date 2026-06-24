# Changelog

All notable changes to loupe are documented here. This project follows [semantic versioning](https://semver.org).

## [Unreleased]

### Added
- **Codebase browse mode** — `loupe browse [path]` opens the whole tracked codebase (optionally scoped to a subtree) in the same review UI, so you can read every file and leave inline questions/notes, then **Compile Review Prompt** to feed an LLM for onboarding or learning. Comments share the existing `.review` store.
- **"What's new" modal** — on the first run of a new version, loupe pops a curated highlights modal; reopen it anytime from the top-bar sparkles button or the `n` shortcut.
- **Independent side-by-side scrolling** — each side-by-side pane now has its own slim horizontal scrollbar (drag it, or **Shift**+scroll over the pane), so a long line scrolls that pane on its own without shoving the other. Fixes long lines overlapping across panes.
- **Word-wrap toggle** — a top-bar button (and the `w` shortcut) turns line wrapping on/off in both unified and side-by-side; off by default. Applies in browse mode too.
- **Comment either pane in side-by-side** — unchanged lines can now be commented on the left (old) pane too, not just the right; the comment remembers its side.

## [0.8.1] — 2026-06-23

### Fixed
- **Top-bar layout at narrow viewports** — left side now shrinks and truncates the ref label instead of colliding with the right side; file count and delta hidden below 640px (visible in the file tree anyway)
- **Code cells no longer wrap** — diff lines scroll horizontally instead of reflowing onto multiple rows
- **"Compile Review Prompt" button stays on one line** — no longer wraps at small widths

### Added
- **Multiline comment gestures in the shortcuts help** — drag the gutter or shift-click to select a range, now documented in the `?` overlay

## [0.8.0] — 2026-06-16

### Added
- **Orphaned-comment cleanup** — when the code moves on and a comment's line or file leaves the current diff, the comment used to disappear from the view while still bloating the compiled prompt. Such orphaned comments are now gathered in the *Compile Review Prompt* dialog under **From earlier reviews**, each with resolve and delete, so every saved comment stays reachable

### Fixed
- **Stale comments no longer leak into the compiled prompt** — comments whose anchor is absent from the current diff are excluded (like resolved ones), so prompts only contain notes about code you're actually reviewing

## [0.7.0] — 2026-06-16

### Added
- **Resolve comments** — mark a comment resolved instead of deleting it; it stays in the thread (dimmed, with a badge) but drops out of the compiled prompt and the open-comment counts, and reopens with one click
- **Markdown preview in the compile dialog** — *Compile Review Prompt* now renders as formatted markdown by default, with a toggle to the raw source; the copy button reads **Copy as Markdown**
- **Loading screen** — an animated indicator while the initial diff loads, instead of a bare "Loading…" line

### Changed
- **Range comments from the line numbers** — drag across the line-number gutter (or shift-click a second line) to select a range, Azure DevOps-style; the hover bubble still works too
- **Markdown opens as a diff** — `.md` files now show their changes by default so edits are obvious; the per-file Preview toggle still renders them
- **`.review` is created lazily** — only your first comment writes the file and appends it to `.gitignore`; just browsing or marking files viewed no longer touches your repo
- Site redesigned as a self-demonstrating review session — the landing page is a diff under review (hunk pills, struck-through deletions, comment-card copy), with a mobile-first layout, active-section highlighting, and a scrollable nav on the docs page

### Performance
- Faster initial load on large diffs: the launch-time diff is served for the first request instead of re-running `git diff`, and syntax highlighting is computed once per hunk (no per-line language auto-detection)

## [0.6.0] — 2026-06-09

### Added
- **Claude themes** — the theme button now cycles light → dark → claude → claude dark; the new pair are warm Anthropic-inspired palettes (ivory paper / soft charcoal, terracotta accents)
- **Word-level diff highlights** — the changed segment inside a modified line pair is tinted in both unified and side-by-side views
- **Keyboard shortcuts** — `j`/`k` walk files, `v` toggles viewed, `s` split, `o` single-file view, `t` theme, `r` refresh, `c` compile, `?` opens a shortcut overlay, `Esc` closes dialogs
- **Comment tags** — label a comment `nit`, `issue`, `question`, or `praise`; pills in the UI, `**[tag]**` prefixes in the compiled prompt
- File-tree **filter box** and a **viewed-progress bar** in the sidebar
- CLI flags: `--port <n>`, `--no-open`, `--version`, `--help` — plus a styled launch banner
- **Landing + docs site** on GitHub Pages ([codywilliamson.github.io/loupe](https://codywilliamson.github.io/loupe/)), deployed by a workflow

### Changed
- Selecting a file in the tree now tracks the current file in all-files view too (powers `j`/`k`/`v`)

## [0.5.0] — 2026-06-04

### Added
- Untracked files now appear in the working-tree view, rendered as additions you can comment on — previously `git diff` hid new, un-added files
- Diff-context header in the top bar: the repo, the diff mode (working tree / staged / branch / range), and the source → target refs, so you always know what you're reviewing
- Comment on **both sides** in side-by-side view, and on removed (old) lines in unified view too — comments remember their side and the exported prompt labels them `Old line N`
- Styled, state-aware hover tooltips on the top-bar icon buttons

### Fixed
- Multi-line comment selection (drag or shift-click) works again when a file has scrolled under the sticky header
- The global side-by-side toggle no longer gets stuck — switching all files is reliable in both directions
- The inline comment box now opens under the side you clicked instead of always the left
- loupe no longer lists its own `.review` file as a changed file
- Side-by-side comments no longer store a broken line reference

## [0.4.0] — 2026-06-03

### Added
- Global view toggles in the top bar: switch **all** files between unified and side-by-side at once, and a **single-file view** that shows one file at a time (click a file in the tree to swap). Both choices persist across reloads, like dark mode
- Sticky file headers: the file name stays pinned at the top while you scroll through its diff
- Update-available badge: a pulsing dot appears next to the wordmark when a newer loupe release exists on origin; click it for the `git pull` command to update
- Diff refresh: a top-bar button re-runs `git diff` in place (and a browser reload now picks up repo changes too), so you can review continuously while an agent edits

### Changed
- Multi-line comments: click-and-drag across lines to highlight a range, then comment — shift-click a second line still extends a range too

## [0.3.0] — 2026-06-02

### Added
- Dark mode with a top-bar toggle (persisted; follows the OS preference by default)
- Markdown files render as a preview by default, with a toggle to the raw diff
- Multiline (range) comments — shift-click a second line to extend the selection; the compiled prompt renders `Lines A–B`
- Resizable sidebar and resizable side-by-side panes (draggable dividers)
- PowerShell syntax highlighting (`.ps1` / `.psm1` / `.psd1`)

### Fixed
- Side-by-side view no longer collapses the right-hand pane
- The inline-comment bubble no longer shifts the line on hover

## [0.2.1] — 2026-06-02

### Documentation
- Document the Windows PowerShell `$PROFILE` install for the global `loupe` command

## [0.2.0] — 2026-06-02

### Added
- Installable `loupe` command — `bin` entry + `#!/usr/bin/env bun` shebang, so `bun link` (macOS/Linux) or a shell function (Windows) runs loupe from any git repo
- Launch banner now summarizes the ref and changed-file count

## [0.1.0] — 2026-06-02

### Added
- Unified and side-by-side git diff viewer with an ADO-faithful UI
- Inline line-level and file-level comments, persisted to `.review`
- Viewed-file tracking in the sidebar
- **Compile Review Prompt** — export all comments as a structured LLM prompt
- CLI modes: working tree, staged, branch, and commit-range diffs
