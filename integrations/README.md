# Loupe integrations

These adapters launch the local stdio MCP server and provide review-session
context. Review Records and the browser remain Loupe's source of truth.

Codex and Claude Code each ship two packages:

- `loupe-review` — the explicit skill plus local MCP configuration.
- `loupe-review-hook` — an optional companion that launches Loupe at `Stop`.

Install the explicit package by default. Add the hook package only when automatic
completion review is desired; a user interrupt bypasses the hook, and an existing
active Review Record prevents duplicate launches.

## Local installation

Register the marketplace, then install the explicit review plugin:

```text
codex plugin marketplace add codywilliamson/loupe
codex plugin add loupe-review@loupe-local

claude plugin marketplace add codywilliamson/loupe
claude plugin install loupe-review@loupe-local --scope user
```

To opt into automatic completion review, additionally install
`loupe-review-hook@loupe-local` with the matching client command.

Newly installed Codex plugins load in a new task. Claude Code loads them in a new
session or after `/reload-plugins`.
