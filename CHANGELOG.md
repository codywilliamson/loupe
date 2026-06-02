# Changelog

All notable changes to loupe are documented here. This project follows [semantic versioning](https://semver.org).

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
