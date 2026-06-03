# Changelog

All notable changes to loupe are documented here. This project follows [semantic versioning](https://semver.org).

## [Unreleased]

### Added
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
